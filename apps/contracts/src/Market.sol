// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AgentRegistry} from "./AgentRegistry.sol";
import {CollateralVault} from "./CollateralVault.sol";
import {LMSR} from "./libs/LMSR.sol";

/// @title Market — single prediction market with LMSR pricing and RWA-backed collateral
/// @dev Owned by MarketFactory. Resolved by OracleSwarm. Routes deposits through CollateralVault.
///      Internal share + cost accounting is wad (1e18); USDT0 has 6 decimals so we scale by 1e12 at I/O.
contract Market is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Outcome {
        UNRESOLVED,
        YES,
        NO,
        INVALID
    }

    /// @dev Conversion factor between USDT0 (6 dec) and internal wad (18 dec).
    uint256 internal constant USDT0_TO_WAD = 1e12;

    struct Position {
        uint256 agentId;
        uint256 yesSharesWad;
        uint256 noSharesWad;
        uint256 stakedUsdt0;
        uint64 enteredAt;
        bytes32 alloraSnapshot;
        bytes32 nansenSnapshot;
        bool claimed;
    }

    // ---- Immutables ----
    string public question;
    uint64 public immutable resolutionAt;
    bytes32 public immutable alloraTopicId;
    uint8 public immutable collateralTier;
    uint16 public immutable minStakeBps;

    /// @notice LMSR liquidity parameter (wad). Larger = deeper market, smaller = sharper price moves.
    uint256 public immutable liquidityB;

    IERC20 public immutable usdt0;
    address public immutable collateralVault;
    address public immutable oracleSwarm;
    address public immutable alloraConsumer;
    address public immutable decisionLog;
    AgentRegistry public immutable agentRegistry;

    // ---- LMSR state ----
    uint256 public yesSharesWad;
    uint256 public noSharesWad;
    uint256 public totalStakedUsdt0;

    // ---- Resolution ----
    Outcome public outcome;
    uint64 public resolvedAt;

    mapping(address bettor => Position) public positions;

    // ---- Events ----
    event Entered(
        address indexed bettor,
        uint8 indexed side,
        uint256 amountUsdt0,
        uint256 sharesMintedWad,
        bytes32 alloraSnapshot,
        bytes32 nansenSnapshot
    );
    event Resolved(uint8 outcome, uint64 at);
    event Claimed(address indexed bettor, uint256 usdt0Paid);

    error MarketResolved();
    error MarketNotResolved();
    error MarketClosed();
    error BelowMinStake();
    error InvalidSide();
    error AlreadyClaimed();
    error NotOracleSwarm();
    error NoWinningPosition();
    error VaultMissing();

    constructor(
        string memory question_,
        uint64 resolutionAt_,
        bytes32 alloraTopicId_,
        uint8 collateralTier_,
        uint16 minStakeBps_,
        uint256 liquidityB_,
        address usdt0_,
        address usdy_,
        address sUSDe_,
        address oracleSwarm_,
        address alloraConsumer_,
        address decisionLog_,
        address agentRegistry_
    ) {
        question = question_;
        resolutionAt = resolutionAt_;
        alloraTopicId = alloraTopicId_;
        collateralTier = collateralTier_;
        minStakeBps = minStakeBps_;
        liquidityB = liquidityB_;
        usdt0 = IERC20(usdt0_);
        oracleSwarm = oracleSwarm_;
        alloraConsumer = alloraConsumer_;
        decisionLog = decisionLog_;
        agentRegistry = AgentRegistry(agentRegistry_);
        collateralVault = address(new CollateralVault(address(this), usdt0_, usdy_, sUSDe_, collateralTier_));
    }

    // ---- Bettor / Trader actions ----

    /// @notice Open or add to a position on `side` (0=YES, 1=NO) by depositing USDT0.
    ///         Shares minted are computed via LMSR inverse-cost.
    function enter(uint8 side, uint256 amountUsdt0, bytes32 alloraSnapshot, bytes32 nansenSnapshot)
        external
        nonReentrant
        returns (uint256 sharesMintedWad)
    {
        if (outcome != Outcome.UNRESOLVED) revert MarketResolved();
        if (block.timestamp >= resolutionAt) revert MarketClosed();
        if (side > 1) revert InvalidSide();
        if (amountUsdt0 == 0) revert BelowMinStake();
        if (collateralVault == address(0)) revert VaultMissing();

        usdt0.safeTransferFrom(msg.sender, collateralVault, amountUsdt0);
        ICollateralVault(collateralVault).acceptDeposit(amountUsdt0);

        uint256 costWad = amountUsdt0 * USDT0_TO_WAD;
        if (side == 0) {
            sharesMintedWad = LMSR.sharesForCost(yesSharesWad, noSharesWad, liquidityB, costWad);
            yesSharesWad += sharesMintedWad;
        } else {
            sharesMintedWad = LMSR.sharesForCost(noSharesWad, yesSharesWad, liquidityB, costWad);
            noSharesWad += sharesMintedWad;
        }

        Position storage p = positions[msg.sender];
        if (p.enteredAt == 0) {
            p.agentId = agentRegistry.tokenIdOf(msg.sender);
            p.enteredAt = uint64(block.timestamp);
            p.alloraSnapshot = alloraSnapshot;
            p.nansenSnapshot = nansenSnapshot;
        }
        if (side == 0) p.yesSharesWad += sharesMintedWad;
        else p.noSharesWad += sharesMintedWad;
        p.stakedUsdt0 += amountUsdt0;
        totalStakedUsdt0 += amountUsdt0;

        emit Entered(msg.sender, side, amountUsdt0, sharesMintedWad, alloraSnapshot, nansenSnapshot);
    }

    /// @notice Called by OracleSwarm after a successful 2-of-3 vote.
    function resolve(uint8 finalOutcome) external {
        if (msg.sender != oracleSwarm) revert NotOracleSwarm();
        if (outcome != Outcome.UNRESOLVED) revert MarketResolved();
        outcome = Outcome(finalOutcome);
        resolvedAt = uint64(block.timestamp);
        emit Resolved(finalOutcome, resolvedAt);
    }

    /// @notice Post-resolution claim.
    /// @dev Payout per winning share = vaultValueUsdt0 / totalWinningSharesWad (in USDT0 base units),
    ///      capped at 1 USDT0 per share (the LMSR no-arb upper bound). For an INVALID outcome,
    ///      every staker gets their stakedUsdt0 back pro-rata to the vault's current value.
    function claim() external nonReentrant returns (uint256 payout) {
        if (outcome == Outcome.UNRESOLVED) revert MarketNotResolved();
        Position storage p = positions[msg.sender];
        if (p.claimed) revert AlreadyClaimed();
        p.claimed = true;

        uint256 vaultUsdt0 = ICollateralVault(collateralVault).vaultValue();

        if (outcome == Outcome.INVALID) {
            // Refund pro-rata to stake.
            if (p.stakedUsdt0 == 0) revert NoWinningPosition();
            payout = (vaultUsdt0 * p.stakedUsdt0) / totalStakedUsdt0;
        } else {
            uint256 winningShares = outcome == Outcome.YES ? p.yesSharesWad : p.noSharesWad;
            if (winningShares == 0) revert NoWinningPosition();
            uint256 totalWinning = outcome == Outcome.YES ? yesSharesWad : noSharesWad;
            // Cap per-share payout at 1 USDT0 per share (1e6 / 1e18 of wad-share).
            uint256 maxPayout = winningShares / USDT0_TO_WAD;
            uint256 proRata = (vaultUsdt0 * winningShares) / totalWinning;
            payout = proRata < maxPayout ? proRata : maxPayout;
        }

        if (payout > 0) ICollateralVault(collateralVault).releaseFor(msg.sender, payout);
        emit Claimed(msg.sender, payout);
    }

    // ---- Views ----

    /// @notice LMSR-derived prices for YES and NO in wad (sum to 1e18).
    function currentPrice() external view returns (uint256 yesPriceE18, uint256 noPriceE18) {
        return LMSR.prices(yesSharesWad, noSharesWad, liquidityB);
    }

    /// @notice Quote: how many shares would `amountUsdt0` buy on `side` right now.
    function quoteShares(uint8 side, uint256 amountUsdt0) external view returns (uint256) {
        uint256 costWad = amountUsdt0 * USDT0_TO_WAD;
        if (side == 0) return LMSR.sharesForCost(yesSharesWad, noSharesWad, liquidityB, costWad);
        return LMSR.sharesForCost(noSharesWad, yesSharesWad, liquidityB, costWad);
    }
}

interface ICollateralVault {
    function acceptDeposit(uint256 amountUsdt0) external;
    function releaseFor(address recipient, uint256 amountUsdt0) external;
    function vaultValue() external view returns (uint256);
}
