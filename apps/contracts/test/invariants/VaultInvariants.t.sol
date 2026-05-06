// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";

/// @dev Foundry invariant suite for CollateralVault.
contract VaultInvariants is Test {
    function invariant_skeleton() public {
        // TODO(team): testInvariant_VaultSolvent — vault always has ≥ owed liabilities.
        assertTrue(true);
    }
}
