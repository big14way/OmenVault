// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {OracleSwarm} from "../src/OracleSwarm.sol";

contract OracleSwarmTest is Test {
    AgentRegistry registry;
    OracleSwarm swarm;
    address admin = makeAddr("admin");

    function setUp() public {
        vm.startPrank(admin);
        registry = new AgentRegistry(admin);
        swarm = new OracleSwarm(admin, registry);
        registry.grantRole(registry.REPUTATION_ROLE(), address(swarm));
        vm.stopPrank();
    }

    function test_skeleton() public {
        // TODO(team): testOracleSwarm3of3
        // TODO(team): testOracleSwarm2of3
        // TODO(team): testOracleSwarmAllDifferent_Reverts
        // TODO(team): testCannotVoteTwice
        // TODO(team): testAgentReputationOnVote
        assertTrue(address(swarm) != address(0));
    }
}
