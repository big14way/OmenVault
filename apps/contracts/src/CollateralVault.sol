// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISUSDe} from "./interfaces/ISUSDe.sol";
import {IUSDY} from "./interfaces/IUSDY.sol";

/// @title CollateralVault — single-tenant vault per market that rotates USDT0 into yield-bearing RWA
/// @notice Tier 0 = USDT0 only. Tier 1 = USDY (Ondo T-bills, ~5% APY). Tier 2 = sUSDe (Ethena, ~12% APY).
/// @dev Only callable by the owning Market.
contract CollateralVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable market;
    IERC20 public immutable usdt0;
    IUSDY public immutable usdy;
    ISUSDe public immutable sUSDe;

    uint8 public immutable tier;

    /// @dev USDT0-equivalent principal deposited (excludes accrued yield).
    uint256 public principalUsdt0;

    error NotMarket();
    error InvalidTier();

    event Deposited(uint256 amountUsdt0, uint8 tier, uint256 rwaShares);
    event Released(address indexed to, uint256 amountUsdt0);

    modifier onlyMarket() {
        if (msg.sender != market) revert NotMarket();
        _;
    }

    constructor(address market_, address usdt0_, address usdy_, address sUSDe_, uint8 tier_) {
        if (tier_ > 2) revert InvalidTier();
        market = market_;
        usdt0 = IERC20(usdt0_);
        usdy = IUSDY(usdy_);
        sUSDe = ISUSDe(sUSDe_);
        tier = tier_;
    }

    /// @notice Pull USDT0 from the market (already transferred in by Market.enter)
    ///         and rotate into the configured RWA tier.
    function acceptDeposit(uint256 amountUsdt0) external onlyMarket nonReentrant {
        principalUsdt0 += amountUsdt0;
        uint256 rwaShares = 0;

        if (tier == 1) {
            usdt0.forceApprove(address(usdy), amountUsdt0);
            rwaShares = usdy.subscribe(amountUsdt0);
        } else if (tier == 2) {
            usdt0.forceApprove(address(sUSDe), amountUsdt0);
            rwaShares = sUSDe.deposit(amountUsdt0, address(this));
        }
        // Tier 0: leave as USDT0.

        emit Deposited(amountUsdt0, tier, rwaShares);
    }

    /// @notice Unwind enough RWA to send `amountUsdt0` to recipient.
    /// @dev Burns just-enough RWA shares. If the unwind underdelivers (slippage/yield drift),
    ///      we fall back to whatever USDT0 the vault holds.
    function releaseFor(address recipient, uint256 amountUsdt0) external onlyMarket nonReentrant {
        if (tier == 1) {
            uint256 pps = usdy.pricePerShare();
            // shares needed (rounded up) = ceil(amountUsdt0 * 1e18 / pps)
            uint256 sharesNeeded = (amountUsdt0 * 1e18 + pps - 1) / pps;
            uint256 bal = IERC20(address(usdy)).balanceOf(address(this));
            if (sharesNeeded > bal) sharesNeeded = bal;
            if (sharesNeeded > 0) usdy.redeem(sharesNeeded);
        } else if (tier == 2) {
            uint256 floor_ = sUSDe.convertToShares(amountUsdt0);
            // Round up by 1 share to absorb integer-division loss.
            uint256 sharesNeeded = floor_ + 1;
            uint256 bal = IERC20(address(sUSDe)).balanceOf(address(this));
            if (sharesNeeded > bal) sharesNeeded = bal;
            if (sharesNeeded > 0) sUSDe.redeem(sharesNeeded, address(this), address(this));
        }

        uint256 available = usdt0.balanceOf(address(this));
        uint256 send = amountUsdt0 < available ? amountUsdt0 : available;
        usdt0.safeTransfer(recipient, send);

        if (send > principalUsdt0) {
            principalUsdt0 = 0;
        } else {
            principalUsdt0 -= send;
        }
        emit Released(recipient, send);
    }

    /// @notice USDT0-equivalent value of the vault including accrued RWA yield.
    function vaultValue() external view returns (uint256) {
        uint256 base = usdt0.balanceOf(address(this));
        if (tier == 1) {
            uint256 shares = IERC20(address(usdy)).balanceOf(address(this));
            base += (shares * usdy.pricePerShare()) / 1e18;
        } else if (tier == 2) {
            uint256 shares = IERC20(address(sUSDe)).balanceOf(address(this));
            base += sUSDe.convertToAssets(shares);
        }
        return base;
    }

    /// @notice USDT0-equivalent yield accrued so far (vaultValue - principal).
    function accruedYield() external view returns (uint256) {
        uint256 v = this.vaultValue();
        return v > principalUsdt0 ? v - principalUsdt0 : 0;
    }
}
