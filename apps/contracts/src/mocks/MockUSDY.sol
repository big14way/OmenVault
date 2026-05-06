// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Test double for Ondo USDY — share price grows linearly to simulate ~5% APY.
contract MockUSDY is ERC20 {
    IERC20 public immutable asset;
    uint64 public immutable startedAt;
    uint256 public constant APY_BPS = 500; // 5% APY

    constructor(address asset_) ERC20("Mock USDY", "USDY") {
        asset = IERC20(asset_);
        startedAt = uint64(block.timestamp);
    }

    function pricePerShare() public view returns (uint256) {
        uint256 elapsed = block.timestamp - startedAt;
        return 1e18 + (1e18 * APY_BPS * elapsed) / (10_000 * 365 days);
    }

    function subscribe(uint256 amountUsdc) external returns (uint256 usdyMinted) {
        asset.transferFrom(msg.sender, address(this), amountUsdc);
        usdyMinted = (amountUsdc * 1e18) / pricePerShare();
        _mint(msg.sender, usdyMinted);
    }

    function redeem(uint256 amountUsdy) external returns (uint256 usdcReturned) {
        usdcReturned = (amountUsdy * pricePerShare()) / 1e18;
        _burn(msg.sender, amountUsdy);
        asset.transfer(msg.sender, usdcReturned);
    }
}
