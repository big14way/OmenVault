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

        // Tokens. As of 2026-05-12, none of USDT0 / sUSDe / USDY have an official
        // Mantle Sepolia deployment, so we ship mocks that mirror each token's
        // mainnet surface (USDT0: 6 dec non-rebasing; sUSDe: ERC-4626 share-price
        // growth ~12% APY; USDY: 18 dec price-accruing ~5% APY).
        //
        // Production swap-in (Mantle mainnet, chain id 5000):
        //   USDT0  = 0x779Ded0c9e1022225f8E0630b35a9b54bE713736 (usdt0.to)
        //   sUSDe  = 0x9D39A5DE30e57443BfF2A8307A4256c8797A3497 (Ethena, Ethereum)
        //   USDY   = 0x5bE26527e817998A7206475496fDE1E68957c5a6 (Ondo, Mantle, KYC-gated)
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
            address(usdy),
            address(sUSDe),
            address(oracleSwarm),
            address(alloraConsumer),
            address(decisionLog)
        );

        // OracleSwarm bumps oracle reputation on each finalize.
        registry.grantRole(registry.REPUTATION_ROLE(), address(oracleSwarm));

        // Trader / oracle bots write to DecisionLog. For now we give the role to the
        // deployer so a follow-up `grant-roles` script can hand it to bot addresses,
        // and to any pre-known bot addresses present in env (BOT_LOGGER_ADDRESS_1..N).
        // Anyone with this role can append to the audit trail — never an admin role.
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
