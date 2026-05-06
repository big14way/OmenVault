// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MarketFactory} from "../src/MarketFactory.sol";
import {OracleSwarm} from "../src/OracleSwarm.sol";
import {AlloraConsumer} from "../src/AlloraConsumer.sol";
import {DecisionLog} from "../src/DecisionLog.sol";
import {MockUSDT0} from "../src/mocks/MockUSDT0.sol";

contract MarketFactoryTest is Test {
    AgentRegistry registry;
    MarketFactory factory;
    OracleSwarm swarm;
    AlloraConsumer alloraConsumer;
    DecisionLog decisionLog;
    MockUSDT0 usdt0;

    address admin = makeAddr("admin");

    function setUp() public {
        vm.startPrank(admin);
        usdt0 = new MockUSDT0();
        registry = new AgentRegistry(admin);
        decisionLog = new DecisionLog(admin);
        alloraConsumer = new AlloraConsumer(admin);
        swarm = new OracleSwarm(admin, registry);
        factory = new MarketFactory(
            admin, registry, address(usdt0), address(0), address(swarm), address(alloraConsumer), address(decisionLog)
        );
        vm.stopPrank();
    }

    function test_createMarket() public {
        MarketFactory.MarketParams memory p = MarketFactory.MarketParams({
            question: "Will ETH close above $4500 on 2026-07-15?",
            resolutionAt: uint64(block.timestamp + 30 days),
            alloraTopicId: bytes32(uint256(14)),
            collateralTier: 2,
            minStakeBps: 10
        });
        address market = factory.createMarket(p);
        assertTrue(market != address(0));
        assertEq(factory.marketsLength(), 1);
    }

    function test_createMarket_revertsOnPastResolution() public {
        MarketFactory.MarketParams memory p = MarketFactory.MarketParams({
            question: "expired",
            resolutionAt: uint64(block.timestamp),
            alloraTopicId: bytes32(0),
            collateralTier: 0,
            minStakeBps: 0
        });
        vm.expectRevert(MarketFactory.InvalidResolutionTime.selector);
        factory.createMarket(p);
    }
}
