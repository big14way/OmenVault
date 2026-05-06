// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @title Market — single prediction market with LMSR pricing and RWA-backed collateral
/// @dev Owned by MarketFactory. Resolved by OracleSwarm. Routes deposits through CollateralVault.
contract Market is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Outcome {
        UNRESOLVED,
        YES,
        NO,
        INVALID
    }

    struct Position {
        uint256 agentId;
        uint256 yesShares;
        uint256 noShares;
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

    IERC20 public immutable usdt0;
    address public immutable collateralVault;
    address public immutable oracleSwarm;
    address public immutable alloraConsumer;
    address public immutable decisionLog;
    AgentRegistry public immutable agentRegistry;

    // ---- LMSR state ----
    /// @dev liquidity parameter b for LMSR cost function. Set on first deposit.
    uint256 public liquidityB;
    uint256 public yesShares;
    uint256 public noShares;
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
        uint256 sharesMinted,
        bytes32 alloraSnapshot,
        bytes32 nansenSnapshot
    );
    event Exited(address indexed bettor, uint8 indexed side, uint256 sharesBurned, uint256 usdt0Returned);
    event Resolved(uint8 outcome, uint64 at);
    event Claimed(address indexed bettor, uint256 usdt0Paid, uint256 yieldShare);

    error MarketResolved();
    error MarketNotResolved();
    error MarketClosed();
    error BelowMinStake();
    error InvalidSide();
    error AlreadyClaimed();
    error NotOracleSwarm();
    error NoWinningPosition();

    constructor(
        string memory question_,
        uint64 resolutionAt_,
        bytes32 alloraTopicId_,
        uint8 collateralTier_,
        uint16 minStakeBps_,
        address usdt0_,
        address collateralVault_,
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
        usdt0 = IERC20(usdt0_);
        collateralVault = collateralVault_;
        oracleSwarm = oracleSwarm_;
        alloraConsumer = alloraConsumer_;
        decisionLog = decisionLog_;
        agentRegistry = AgentRegistry(agentRegistry_);
    }

    // ---- Bettor / Trader actions ----

    /// @notice Open or add to a position on `side` (0=YES, 1=NO) by depositing USDT0.
    /// @dev TODO(team): Implement LMSR shares-minted math; route deposit to CollateralVault.acceptDeposit.
    function enter(uint8 side, uint256 amountUsdt0, bytes32 alloraSnapshot, bytes32 nansenSnapshot)
        external
        nonReentrant
    {
        if (outcome != Outcome.UNRESOLVED) revert MarketResolved();
        if (block.timestamp >= resolutionAt) revert MarketClosed();
        if (side > 1) revert InvalidSide();
        // TODO(team): enforce minStakeBps relative to current vault size.
        if (amountUsdt0 == 0) revert BelowMinStake();

        usdt0.safeTransferFrom(msg.sender, collateralVault, amountUsdt0);

        // TODO(team): call CollateralVault.acceptDeposit(amountUsdt0, collateralTier).
        // TODO(team): compute shares via LMSR cost function with liquidity parameter b.
        uint256 sharesMinted = amountUsdt0; // placeholder 1:1 — replace with LMSR math.

        Position storage p = positions[msg.sender];
        if (p.enteredAt == 0) {
            p.agentId = agentRegistry.tokenIdOf(msg.sender);
            p.enteredAt = uint64(block.timestamp);
            p.alloraSnapshot = alloraSnapshot;
            p.nansenSnapshot = nansenSnapshot;
        }
        if (side == 0) {
            p.yesShares += sharesMinted;
            yesShares += sharesMinted;
        } else {
            p.noShares += sharesMinted;
            noShares += sharesMinted;
        }
        p.stakedUsdt0 += amountUsdt0;
        totalStakedUsdt0 += amountUsdt0;

        emit Entered(msg.sender, side, amountUsdt0, sharesMinted, alloraSnapshot, nansenSnapshot);
    }

    /// @notice Pre-resolution exit. May charge a fee (TODO).
    function exit(uint8 side, uint256 shares) external nonReentrant {
        if (outcome != Outcome.UNRESOLVED) revert MarketResolved();
        if (side > 1) revert InvalidSide();
        // TODO(team): LMSR exit math; release vault collateral.
        revert("Market: exit not yet implemented");
    }

    /// @notice Called by OracleSwarm after a successful 2-of-3 vote.
    function resolve(uint8 finalOutcome) external {
        if (msg.sender != oracleSwarm) revert NotOracleSwarm();
        if (outcome != Outcome.UNRESOLVED) revert MarketResolved();
        outcome = Outcome(finalOutcome);
        resolvedAt = uint64(block.timestamp);
        emit Resolved(finalOutcome, resolvedAt);
    }

    /// @notice Post-resolution claim: principal + LMSR upside + RWA yield share.
    /// @dev TODO(team): Implement payout math: winning shares × payoutPerShare from CollateralVault.vaultValue().
    function claim() external nonReentrant {
        if (outcome == Outcome.UNRESOLVED) revert MarketNotResolved();
        Position storage p = positions[msg.sender];
        if (p.claimed) revert AlreadyClaimed();

        uint256 winningShares = outcome == Outcome.YES ? p.yesShares : (outcome == Outcome.NO ? p.noShares : 0);
        if (winningShares == 0 && outcome != Outcome.INVALID) revert NoWinningPosition();

        p.claimed = true;
        // TODO(team): call CollateralVault.releaseFor(msg.sender, payout) — payout includes accrued RWA yield.
        emit Claimed(msg.sender, 0, 0);
    }

    // ---- Views ----

    /// @notice LMSR-derived prices for YES and NO sides, in 1e18.
    /// @dev TODO(team): implement cost function: p_yes = exp(yes/b) / (exp(yes/b) + exp(no/b)).
    function currentPrice() external view returns (uint256 yesPriceE18, uint256 noPriceE18) {
        uint256 total = yesShares + noShares;
        if (total == 0) return (5e17, 5e17);
        yesPriceE18 = (yesShares * 1e18) / total;
        noPriceE18 = 1e18 - yesPriceE18;
    }
}
