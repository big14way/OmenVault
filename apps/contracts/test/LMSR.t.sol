// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {LMSR} from "../src/libs/LMSR.sol";

contract LMSRTest is Test {
    uint256 constant B = 1000e18; // 1000 wad units of liquidity

    function test_initialPriceIsHalf() public pure {
        (uint256 pY, uint256 pN) = LMSR.prices(0, 0, B);
        assertEq(pY, 5e17);
        assertEq(pN, 5e17);
    }

    function test_pricesSumToOne() public pure {
        (uint256 pY, uint256 pN) = LMSR.prices(500e18, 200e18, B);
        assertEq(pY + pN, 1e18);
    }

    function test_yesPriceRisesWhenYesShares() public pure {
        (uint256 pYBase,) = LMSR.prices(0, 0, B);
        (uint256 pYHi,) = LMSR.prices(500e18, 0, B);
        assertGt(pYHi, pYBase);
    }

    function test_sharesForCost_smallTradePricedNearMid() public pure {
        // Buying $10 worth of YES from a fresh market (price ~0.50) should yield ~20 shares.
        uint256 shares = LMSR.sharesForCost(0, 0, B, 10e18);
        // Within +/- 1% of 20 wad-shares.
        assertGt(shares, 19.8e18);
        assertLt(shares, 20.2e18);
    }

    function test_costToBuyMonotonic() public pure {
        uint256 c1 = LMSR.costToBuy(100e18, 100e18, B, 10e18);
        uint256 c2 = LMSR.costToBuy(100e18, 100e18, B, 20e18);
        uint256 c3 = LMSR.costToBuy(100e18, 100e18, B, 50e18);
        assertGt(c2, c1);
        assertGt(c3, c2);
    }

    function test_sharesForCostInvertsCost() public pure {
        // Buying enough shares to cost 50e18, then asking how many shares 50e18 buys, must round-trip.
        uint256 shares = 30e18;
        uint256 cost = LMSR.costToBuy(0, 0, B, shares);
        uint256 sharesBack = LMSR.sharesForCost(0, 0, B, cost);
        // Allow tiny rounding (< 0.01% drift).
        uint256 diff = shares > sharesBack ? shares - sharesBack : sharesBack - shares;
        assertLt(diff, shares / 10_000);
    }

    function testFuzz_pricesSumToOne(uint96 qY, uint96 qN) public pure {
        // Bound to keep the difference within numerical safety.
        uint256 y = uint256(qY) % 5000e18;
        uint256 n = uint256(qN) % 5000e18;
        (uint256 pY, uint256 pN) = LMSR.prices(y, n, B);
        // Sum must be exactly 1e18 by construction.
        assertEq(pY + pN, 1e18);
    }
}
