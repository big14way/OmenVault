// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MarketFactory} from "../src/MarketFactory.sol";
import {Market} from "../src/Market.sol";
import {OracleSwarm} from "../src/OracleSwarm.sol";
import {AlloraConsumer} from "../src/AlloraConsumer.sol";
import {DecisionLog} from "../src/DecisionLog.sol";
import {MockUSDT0} from "../src/mocks/MockUSDT0.sol";
import {MockSUSDe} from "../src/mocks/MockSUSDe.sol";
import {MockUSDY} from "../src/mocks/MockUSDY.sol";

contract MarketTest is Test {
    AgentRegistry registry;
    MarketFactory factory;
    OracleSwarm swarm;
    AlloraConsumer alloraConsumer;
    DecisionLog decisionLog;
    MockUSDT0 usdt0;
    MockUSDY usdy;
    MockSUSDe sUSDe;

    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    Market market;

    function setUp() public {
        vm.startPrank(admin);
        usdt0 = new MockUSDT0();
        usdy = new MockUSDY(address(usdt0));
        sUSDe = new MockSUSDe(address(usdt0));
        registry = new AgentRegistry(admin);
        decisionLog = new DecisionLog(admin);
        alloraConsumer = new AlloraConsumer(admin);
        swarm = new OracleSwarm(admin, registry);
        factory = new MarketFactory(
            admin,
            registry,
            address(usdt0),
            address(usdy),
            address(sUSDe),
            address(swarm),
            address(alloraConsumer),
            address(decisionLog)
        );
        vm.stopPrank();

        MarketFactory.MarketParams memory p = MarketFactory.MarketParams({
            question: "Will ETH close above $4500 on 2026-07-15?",
            resolutionAt: uint64(block.timestamp + 30 days),
            alloraTopicId: bytes32(uint256(14)),
            collateralTier: 0, // tier 0 = USDT0 only, simplest for unit tests
            minStakeBps: 0,
            liquidityB: 0
        });
        market = Market(factory.createMarket(p));

        usdt0.mint(alice, 10_000e6);
        usdt0.mint(bob, 10_000e6);
    }

    function test_initialPriceIsHalf() public view {
        (uint256 pY, uint256 pN) = market.currentPrice();
        assertEq(pY, 5e17);
        assertEq(pN, 5e17);
    }

    function test_enterMintsLMSRShares() public {
        vm.startPrank(alice);
        usdt0.approve(address(market), 100e6);
        uint256 shares = market.enter(0, 100e6, bytes32(0), bytes32(0));
        vm.stopPrank();

        // LMSR with b=1000 buys b * ln((2*e^(cost/b) - 1)) shares for `cost` USDT0.
        // For cost=$100 → b · ln(2·e^0.1 - 1) ≈ 190.89 wad-shares.
        assertGt(shares, 190e18);
        assertLt(shares, 192e18);
        assertEq(market.totalStakedUsdt0(), 100e6);
    }

    function test_enterMovesPriceTowardSide() public {
        vm.startPrank(alice);
        usdt0.approve(address(market), 500e6);
        market.enter(0, 500e6, bytes32(0), bytes32(0));
        vm.stopPrank();

        (uint256 pY, uint256 pN) = market.currentPrice();
        assertGt(pY, 5e17);
        assertLt(pN, 5e17);
        assertEq(pY + pN, 1e18);
    }

    function test_quoteSharesMatchesEnter() public {
        uint256 quoted = market.quoteShares(0, 250e6);
        vm.startPrank(alice);
        usdt0.approve(address(market), 250e6);
        uint256 actual = market.enter(0, 250e6, bytes32(0), bytes32(0));
        vm.stopPrank();
        assertEq(quoted, actual);
    }

    function test_endToEnd_yesWinsClaim() public {
        // Alice stakes 200 USDT0 on YES, Bob stakes 100 USDT0 on NO.
        vm.startPrank(alice);
        usdt0.approve(address(market), 200e6);
        uint256 aliceShares = market.enter(0, 200e6, bytes32(0), bytes32(0));
        vm.stopPrank();

        vm.startPrank(bob);
        usdt0.approve(address(market), 100e6);
        market.enter(1, 100e6, bytes32(0), bytes32(0));
        vm.stopPrank();

        // Resolve YES via the swarm address (skip multi-sig path for unit test).
        vm.warp(block.timestamp + 31 days);
        vm.prank(address(swarm));
        market.resolve(1); // 1 = YES

        // Alice claims; Bob's claim must revert.
        uint256 aliceBalBefore = usdt0.balanceOf(alice);
        vm.prank(alice);
        uint256 payout = market.claim();
        assertGt(payout, 0);
        assertEq(usdt0.balanceOf(alice), aliceBalBefore + payout);

        vm.expectRevert(Market.NoWinningPosition.selector);
        vm.prank(bob);
        market.claim();

        // Sanity: payout cannot exceed 1 USDT0 per share.
        uint256 maxPayout = aliceShares / 1e12;
        assertLe(payout, maxPayout);
    }

    function test_enter_revertsAfterResolution() public {
        vm.warp(block.timestamp + 31 days);
        vm.prank(address(swarm));
        market.resolve(1);

        vm.startPrank(alice);
        usdt0.approve(address(market), 100e6);
        vm.expectRevert(Market.MarketResolved.selector);
        market.enter(0, 100e6, bytes32(0), bytes32(0));
        vm.stopPrank();
    }

    function test_resolve_onlySwarm() public {
        vm.warp(block.timestamp + 31 days);
        vm.expectRevert(Market.NotOracleSwarm.selector);
        vm.prank(alice);
        market.resolve(1);
    }
}
