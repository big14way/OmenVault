// Re-export ABIs typed as `viem`'s `Abi`. Keep in sync with apps/contracts/out
// after a contract change:
//   pnpm -F @omenvault/contracts build && \
//   for c in AgentRegistry AlloraConsumer CollateralVault DecisionLog Market MarketFactory OracleSwarm MockUSDT0; do \
//     jq '.abi' apps/contracts/out/${c}.sol/${c}.json > apps/web/lib/web3/abis/${c}.json; \
//   done

import type {Abi} from "viem";
import AgentRegistry from "./AgentRegistry.json";
import AlloraConsumer from "./AlloraConsumer.json";
import CollateralVault from "./CollateralVault.json";
import DecisionLog from "./DecisionLog.json";
import Market from "./Market.json";
import MarketFactory from "./MarketFactory.json";
import MockUSDT0 from "./MockUSDT0.json";
import OracleSwarm from "./OracleSwarm.json";

export const agentRegistryAbi = AgentRegistry as Abi;
export const alloraConsumerAbi = AlloraConsumer as Abi;
export const collateralVaultAbi = CollateralVault as Abi;
export const decisionLogAbi = DecisionLog as Abi;
export const marketAbi = Market as Abi;
export const marketFactoryAbi = MarketFactory as Abi;
export const usdt0Abi = MockUSDT0 as Abi;
export const oracleSwarmAbi = OracleSwarm as Abi;
