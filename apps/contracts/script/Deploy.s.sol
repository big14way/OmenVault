// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MarketFactory} from "../src/MarketFactory.sol";
import {OracleSwarm} from "../src/OracleSwarm.sol";
import {AlloraConsumer} from "../src/AlloraConsumer.sol";
import {DecisionLog} from "../src/DecisionLog.sol";
import {MockUSDT0} from "../src/mocks/MockUSDT0.sol";
import {MockSUSDe} from "../src/mocks/MockSUSDe.sol";
import {MockUSDY} from "../src/mocks/MockUSDY.sol";

/// @notice Deploys the full OmenVault stack to Mantle Sepolia.
contract DeployScript is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);

        // Tokens (use mocks on Sepolia until production tokens are bridged).
        MockUSDT0 usdt0 = new MockUSDT0();
        MockSUSDe sUSDe = new MockSUSDe(address(usdt0));
        MockUSDY usdy = new MockUSDY(address(usdt0));

        // Core protocol.
        AgentRegistry registry = new AgentRegistry(deployer);
        DecisionLog decisionLog = new DecisionLog(deployer);
        AlloraConsumer alloraConsumer = new AlloraConsumer(deployer);
        OracleSwarm oracleSwarm = new OracleSwarm(deployer, registry);

        // CollateralVault is per-market and deployed by the Market constructor; pass token addresses.
        // Factory wires everything together.
        MarketFactory factory = new MarketFactory(
            deployer,
            registry,
            address(usdt0),
            address(0), // collateralVaultImpl — vaults are deployed per Market by team logic.
            address(oracleSwarm),
            address(alloraConsumer),
            address(decisionLog)
        );

        // Grant logging role to the deployer + downstream contracts that emit decisions.
        registry.grantRole(registry.REPUTATION_ROLE(), address(oracleSwarm));

        vm.stopBroadcast();

        console.log("--- OmenVault deployed to Mantle Sepolia ---");
        console.log("USDT0 (mock):     %s", address(usdt0));
        console.log("sUSDe (mock):     %s", address(sUSDe));
        console.log("USDY  (mock):     %s", address(usdy));
        console.log("AgentRegistry:    %s", address(registry));
        console.log("DecisionLog:      %s", address(decisionLog));
        console.log("AlloraConsumer:   %s", address(alloraConsumer));
        console.log("OracleSwarm:      %s", address(oracleSwarm));
        console.log("MarketFactory:    %s", address(factory));
    }
}
