// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {MockUSDT0} from "../src/mocks/MockUSDT0.sol";
import {MockSUSDe} from "../src/mocks/MockSUSDe.sol";
import {MockUSDY} from "../src/mocks/MockUSDY.sol";

contract CollateralVaultTest is Test {
    MockUSDT0 usdt0;
    MockSUSDe sUSDe;
    MockUSDY usdy;
    CollateralVault vault;

    address market = makeAddr("market");
    address winner = makeAddr("winner");

    function _setupTier(uint8 tier) internal {
        usdt0 = new MockUSDT0();
        sUSDe = new MockSUSDe(address(usdt0));
        usdy = new MockUSDY(address(usdt0));
        vault = new CollateralVault(market, address(usdt0), address(usdy), address(sUSDe), tier);
        usdt0.mint(market, 1_000e6);
    }

    function _deposit(uint256 amountUsdt0) internal {
        vm.prank(market);
        usdt0.transfer(address(vault), amountUsdt0);
        vm.prank(market);
        vault.acceptDeposit(amountUsdt0);
    }

    function test_tier0_holdsUsdt0Directly() public {
        _setupTier(0);
        _deposit(500e6);
        assertEq(usdt0.balanceOf(address(vault)), 500e6);
        assertEq(vault.vaultValue(), 500e6);
        assertEq(vault.accruedYield(), 0);
    }

    function test_tier1_routesToUsdy() public {
        _setupTier(1);
        _deposit(500e6);
        // USDT0 should be converted to USDY shares.
        assertEq(usdt0.balanceOf(address(vault)), 0);
        assertGt(usdy.balanceOf(address(vault)), 0);
        // vaultValue at t=0 ≈ principal (the share-price floor is 1e18).
        assertApproxEqAbs(vault.vaultValue(), 500e6, 1);
    }

    function test_tier2_routesToSUSDe() public {
        _setupTier(2);
        _deposit(500e6);
        assertEq(usdt0.balanceOf(address(vault)), 0);
        assertGt(sUSDe.balanceOf(address(vault)), 0);
        assertApproxEqAbs(vault.vaultValue(), 500e6, 1);
    }

    function test_tier2_accruesYieldOverTime() public {
        _setupTier(2);
        _deposit(1_000e6);

        // Skip 365 days — sUSDe mock yields 12% APY linearly.
        vm.warp(block.timestamp + 365 days);

        uint256 v = vault.vaultValue();
        // Expect ~12% accrual.
        assertApproxEqRel(v, 1_120e6, 0.01e18); // within 1%
        uint256 yield_ = vault.accruedYield();
        assertApproxEqRel(yield_, 120e6, 0.01e18);
    }

    function test_releaseFor_tier0_paysOutUsdt0() public {
        _setupTier(0);
        _deposit(500e6);
        vm.prank(market);
        vault.releaseFor(winner, 200e6);
        assertEq(usdt0.balanceOf(winner), 200e6);
        assertEq(vault.principalUsdt0(), 300e6);
    }

    function test_releaseFor_tier2_unwindsAndPays() public {
        _setupTier(2);
        _deposit(1_000e6);
        vm.warp(block.timestamp + 180 days);

        uint256 vBefore = vault.vaultValue();
        uint256 redeemAmount = 500e6;
        vm.prank(market);
        vault.releaseFor(winner, redeemAmount);

        assertEq(usdt0.balanceOf(winner), redeemAmount);
        // Vault should still hold roughly (vBefore - redeemAmount) in USDT0-equivalent.
        assertApproxEqRel(vault.vaultValue(), vBefore - redeemAmount, 0.001e18);
    }

    function test_acceptDeposit_onlyMarket() public {
        _setupTier(0);
        vm.expectRevert(CollateralVault.NotMarket.selector);
        vault.acceptDeposit(100e6);
    }

    function test_releaseFor_onlyMarket() public {
        _setupTier(0);
        vm.expectRevert(CollateralVault.NotMarket.selector);
        vault.releaseFor(winner, 100e6);
    }

    function test_invalidTier_reverts() public {
        usdt0 = new MockUSDT0();
        sUSDe = new MockSUSDe(address(usdt0));
        usdy = new MockUSDY(address(usdt0));
        vm.expectRevert(CollateralVault.InvalidTier.selector);
        new CollateralVault(market, address(usdt0), address(usdy), address(sUSDe), 99);
    }
}
