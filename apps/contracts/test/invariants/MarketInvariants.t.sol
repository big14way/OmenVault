// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";

/// @dev Foundry invariant suite for Market. Team to implement the handler + fuzz harness.
contract MarketInvariants is Test {
    function invariant_skeleton() public {
        // TODO(team): testInvariant_LMSRConservation — sum of YES + NO shares × prices = invariant + collateral inflows
        assertTrue(true);
    }
}
