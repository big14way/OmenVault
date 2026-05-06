// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Test double for sUSDe — share price grows linearly to simulate ~12% APY.
contract MockSUSDe is ERC20 {
    IERC20 public immutable asset;
    uint64 public immutable startedAt;
    uint256 public constant APY_BPS = 1_200; // 12% APY in basis points

    constructor(address asset_) ERC20("Mock sUSDe", "sUSDe") {
        asset = IERC20(asset_);
        startedAt = uint64(block.timestamp);
    }

    function pricePerShareE18() public view returns (uint256) {
        uint256 elapsed = block.timestamp - startedAt;
        // 1e18 + (1e18 * APY_BPS * elapsed) / (10000 * 365 days)
        return 1e18 + (1e18 * APY_BPS * elapsed) / (10_000 * 365 days);
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        asset.transferFrom(msg.sender, address(this), assets);
        shares = (assets * 1e18) / pricePerShareE18();
        _mint(receiver, shares);
    }

    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }
        assets = (shares * pricePerShareE18()) / 1e18;
        _burn(owner, shares);
        asset.transfer(receiver, assets);
    }

    function convertToAssets(uint256 shares) external view returns (uint256) {
        return (shares * pricePerShareE18()) / 1e18;
    }
}
