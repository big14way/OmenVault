// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {MockUSDT0} from "../src/mocks/MockUSDT0.sol";
import {MockSUSDe} from "../src/mocks/MockSUSDe.sol";
import {MockUSDY} from "../src/mocks/MockUSDY.sol";

/// @dev Skeleton test file. Team should expand once CollateralVault tier-routing is implemented.
contract CollateralVaultTest is Test {
    function test_skeleton() public {
        // TODO(team): testInvariant_VaultSolvent
        // TODO(team): test deposit routes to correct tier
        // TODO(team): test releaseFor unwinds RWA
        assertTrue(true);
    }
}
