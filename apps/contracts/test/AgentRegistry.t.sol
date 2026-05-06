// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry registry;
    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        vm.prank(admin);
        registry = new AgentRegistry(admin);
    }

    function test_register_assignsTokenId() public {
        vm.prank(admin);
        uint256 id = registry.register(AgentRegistry.AgentType.Trader, alice, "ipfs://meta1");
        assertEq(id, 1);
        assertEq(registry.tokenIdOf(alice), 1);
        assertTrue(registry.isAgent(alice, AgentRegistry.AgentType.Trader));
    }

    function test_register_revertsOnDuplicate() public {
        vm.startPrank(admin);
        registry.register(AgentRegistry.AgentType.Trader, alice, "ipfs://m");
        vm.expectRevert(AgentRegistry.AlreadyRegistered.selector);
        registry.register(AgentRegistry.AgentType.OracleNode, alice, "ipfs://m2");
        vm.stopPrank();
    }

    function test_soulbound_blocksTransfer() public {
        vm.prank(admin);
        uint256 id = registry.register(AgentRegistry.AgentType.OracleNode, alice, "ipfs://m");

        vm.prank(alice);
        vm.expectRevert(AgentRegistry.Soulbound.selector);
        registry.transferFrom(alice, bob, id);
    }

    function test_reputation_adjusts() public {
        vm.startPrank(admin);
        uint256 id = registry.register(AgentRegistry.AgentType.OracleNode, alice, "ipfs://m");
        registry.adjustReputation(id, 5);
        registry.adjustReputation(id, -2);
        vm.stopPrank();

        (,,, int256 reputation,) = registry.agents(id);
        assertEq(reputation, 3);
    }
}
