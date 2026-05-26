// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {MarketFactory} from "../src/MarketFactory.sol";
import {OracleSwarm} from "../src/OracleSwarm.sol";
import {AlloraConsumer} from "../src/AlloraConsumer.sol";
import {DecisionLog} from "../src/DecisionLog.sol";
import {MockSUSDe} from "../src/mocks/MockSUSDe.sol";
import {MockUSDY} from "../src/mocks/MockUSDY.sol";

/// @notice Deploys the OmenVault stack to Mantle mainnet (chain id 5000).
/// Uses real USDT0 for settlement. sUSDe and USDY are not natively on Mantle
/// mainnet today (sUSDe lives on Ethereum, USDY is KYC-gated), so we deploy
/// clearly-labeled mocks for the yield tiers and disclose this in the README.
contract DeployMainnetScript is Script {
    function run() external {
        require(block.chainid == 5000, "DeployMainnet: wrong chain (expected Mantle mainnet 5000)");

        address usdt0Mainnet = vm.envAddress("USDT0_ADDRESS_MAINNET");
        require(usdt0Mainnet.code.length > 0, "USDT0_ADDRESS_MAINNET has no code");

        address deployer = msg.sender;
        vm.startBroadcast();

        // Real USDT0 on Mantle mainnet (0x779Ded0c9e1022225f8E0630b35a9b54bE713736).
        // Mocks for yield tiers, labeled so explorers/wallets surface them as mocks
        // not as impersonations of Ethena sUSDe or Ondo USDY.
        MockSUSDe sUSDe = new MockSUSDe(usdt0Mainnet);
        MockUSDY usdy = new MockUSDY(usdt0Mainnet);

        AgentRegistry registry = new AgentRegistry(deployer);
        DecisionLog decisionLog = new DecisionLog(deployer);
        AlloraConsumer alloraConsumer = new AlloraConsumer(deployer);
        OracleSwarm oracleSwarm = new OracleSwarm(deployer, registry);

        MarketFactory factory = new MarketFactory(
            deployer,
            registry,
            usdt0Mainnet,
            address(usdy),
            address(sUSDe),
            address(oracleSwarm),
            address(alloraConsumer),
            address(decisionLog)
        );

        registry.grantRole(registry.REPUTATION_ROLE(), address(oracleSwarm));

        for (uint256 i = 1; i <= 8; i++) {
            string memory key = string.concat("BOT_LOGGER_ADDRESS_", vm.toString(i));
            try vm.envAddress(key) returns (address bot) {
                if (bot != address(0)) {
                    decisionLog.grantRole(decisionLog.LOGGER_ROLE(), bot);
                    console.log("granted LOGGER_ROLE to %s", bot);
                }
            } catch {}
        }

        vm.stopBroadcast();

        console.log("--- OmenVault deployed to Mantle mainnet ---");
        console.log("USDT0 (real):     %s", usdt0Mainnet);
        console.log("sUSDe (MOCK):     %s", address(sUSDe));
        console.log("USDY  (MOCK):     %s", address(usdy));
        console.log("AgentRegistry:    %s", address(registry));
        console.log("DecisionLog:      %s", address(decisionLog));
        console.log("AlloraConsumer:   %s", address(alloraConsumer));
        console.log("OracleSwarm:      %s", address(oracleSwarm));
        console.log("MarketFactory:    %s", address(factory));
    }
}
