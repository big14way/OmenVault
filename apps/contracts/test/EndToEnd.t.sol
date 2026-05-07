// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MarketFactory} from "../src/MarketFactory.sol";
import {Market} from "../src/Market.sol";
import {OracleSwarm} from "../src/OracleSwarm.sol";
import {AlloraConsumer} from "../src/AlloraConsumer.sol";
import {DecisionLog} from "../src/DecisionLog.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {MockUSDT0} from "../src/mocks/MockUSDT0.sol";
import {MockSUSDe} from "../src/mocks/MockSUSDe.sol";
import {MockUSDY} from "../src/mocks/MockUSDY.sol";

/// @notice Headline end-to-end test: market with sUSDe collateral accrues yield while open;
///         on resolution, the winner gets principal + LMSR upside + yield share.
contract EndToEndTest is Test {
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
    }

    function test_endToEndPredictionMarketLoop_withYield() public {
        // 1. Create a sUSDe-collateralized market (tier 2, ~12% APY).
        MarketFactory.MarketParams memory p = MarketFactory.MarketParams({
            question: "Will ETH close above $4500 on 2026-07-15?",
            resolutionAt: uint64(block.timestamp + 365 days),
            alloraTopicId: bytes32(uint256(14)),
            collateralTier: 2,
            minStakeBps: 0,
            liquidityB: 0
        });
        Market market = Market(factory.createMarket(p));
        CollateralVault vault = CollateralVault(market.collateralVault());

        // 2. Mint USDT0 to bettors.
        usdt0.mint(alice, 10_000e6);
        usdt0.mint(bob, 10_000e6);

        // 3. Alice stakes 500 USDT0 on YES, Bob stakes 500 USDT0 on NO.
        vm.startPrank(alice);
        usdt0.approve(address(market), 500e6);
        market.enter(0, 500e6, bytes32(uint256(0xA110)), bytes32(uint256(0xBEEF)));
        vm.stopPrank();

        vm.startPrank(bob);
        usdt0.approve(address(market), 500e6);
        market.enter(1, 500e6, bytes32(0), bytes32(0));
        vm.stopPrank();

        // Vault holds ~1000 USDT0 worth, all converted into sUSDe.
        assertEq(vault.principalUsdt0(), 1_000e6);
        assertGt(sUSDe.balanceOf(address(vault)), 0);

        // 4. Time passes — 1 year — yield accrues at ~12%.
        vm.warp(block.timestamp + 365 days);

        // Yield bar: vault should now show ~12% accrual.
        uint256 vaultV = vault.vaultValue();
        assertApproxEqRel(vaultV, 1_120e6, 0.01e18);
        uint256 yield_ = vault.accruedYield();
        assertApproxEqRel(yield_, 120e6, 0.01e18);

        // 5. Oracle swarm resolves YES.
        vm.prank(address(swarm));
        market.resolve(1); // 1 = YES

        // 6. Alice claims; she gets her LMSR-weighted share of the *grown* vault.
        uint256 aliceBefore = usdt0.balanceOf(alice);
        vm.prank(alice);
        uint256 payout = market.claim();

        // Alice's $500 deposit at fresh-market price 0.5 with b=1000 buys ~832 LMSR wad-shares
        // (b · ln(2·e^0.5 - 1)). YES wins → her cap is 832 USDT0 (1 per share). Vault has $1120
        // (yield grew it past the cap), so the per-share cap binds: she receives ~832 USDT0.
        // The ~$288 leftover in the vault represents the unsubsidized LMSR worst-case-loss buffer
        // that nobody had to pre-fund.
        assertGt(payout, 825e6);
        assertLt(payout, 835e6);
        assertEq(usdt0.balanceOf(alice), aliceBefore + payout);

        // Profit check: Alice paid $500, got back ~$832 — a ~66% return driven by LMSR upside.
        assertGt(payout, 500e6);

        // 7. Bob's NO claim must revert.
        vm.expectRevert(Market.NoWinningPosition.selector);
        vm.prank(bob);
        market.claim();
    }
}
