// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CollateralVault — single-tenant vault per market that rotates USDT0 into yield-bearing RWA
/// @notice Tier 0 = USDT0 only. Tier 1 = USDY (Ondo T-bills, ~5% APY). Tier 2 = sUSDe (Ethena, ~12% APY).
/// @dev Only callable by the owning Market.
contract CollateralVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable market;
    IERC20 public immutable usdt0;
    IERC20 public immutable usdy;
    IERC20 public immutable sUSDe;

    uint8 public immutable tier;

    /// @dev Tracks the USDT0-equivalent principal (excludes accrued yield).
    uint256 public principalUsdt0;

    error NotMarket();
    error InvalidTier();

    event Deposited(uint256 amountUsdt0, uint8 tier);
    event Released(address indexed to, uint256 amountUsdt0);

    modifier onlyMarket() {
        if (msg.sender != market) revert NotMarket();
        _;
    }

    constructor(address market_, address usdt0_, address usdy_, address sUSDe_, uint8 tier_) {
        if (tier_ > 2) revert InvalidTier();
        market = market_;
        usdt0 = IERC20(usdt0_);
        usdy = IERC20(usdy_);
        sUSDe = IERC20(sUSDe_);
        tier = tier_;
    }

    /// @notice Pull USDT0 from the market and rotate into the configured RWA tier.
    /// @dev TODO(team): integrate Ondo USDY mint and Ethena sUSDe deposit flows.
    function acceptDeposit(uint256 amountUsdt0) external onlyMarket nonReentrant {
        principalUsdt0 += amountUsdt0;
        // Tier 0 — leave as USDT0.
        // Tier 1 — TODO(team): mint USDY via Ondo subscribe.
        // Tier 2 — TODO(team): deposit USDT0 → USDe → sUSDe via Ethena.
        emit Deposited(amountUsdt0, tier);
    }

    /// @notice Unwind RWA back to USDT0 and send to recipient (winners + LP).
    /// @dev TODO(team): redeem USDY or unstake sUSDe; handle slippage.
    function releaseFor(address recipient, uint256 amountUsdt0) external onlyMarket nonReentrant {
        // TODO(team): swap RWA back to USDT0 if needed.
        usdt0.safeTransfer(recipient, amountUsdt0);
        if (amountUsdt0 > principalUsdt0) {
            principalUsdt0 = 0;
        } else {
            principalUsdt0 -= amountUsdt0;
        }
        emit Released(recipient, amountUsdt0);
    }

    /// @notice USDT0-equivalent value of the vault including accrued RWA yield.
    /// @dev TODO(team): query sUSDe/USDY underlying value via their oracles or share-price.
    function vaultValue() external view returns (uint256) {
        if (tier == 0) {
            return usdt0.balanceOf(address(this));
        }
        // TODO(team): compute USDT0-equivalent for tier 1/2.
        return principalUsdt0;
    }

    function accruedYield() external view returns (uint256) {
        uint256 v = this.vaultValue();
        return v > principalUsdt0 ? v - principalUsdt0 : 0;
    }
}
