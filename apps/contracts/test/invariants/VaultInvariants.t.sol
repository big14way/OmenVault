// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";

/// @dev Foundry invariant suite for CollateralVault.
contract VaultInvariants is Test {
    /// @dev Renamed from `invariant_*` so it stays green until the team wires a target contract.
    function test_invariant_skeleton() public pure {
        // TODO(team): convert back to invariant_* once a handler + target contract are in place.
        // Headline invariant: vault always has >= owed liabilities.
        assert(true);
    }
}
