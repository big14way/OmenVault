// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Minimal interface for Ondo USDY (rebasing T-bill token).
interface IUSDY is IERC20 {
    function pricePerShare() external view returns (uint256);
    function subscribe(uint256 amountUsdc) external returns (uint256 usdyMinted);
    function redeem(uint256 amountUsdy) external returns (uint256 usdcReturned);
}
