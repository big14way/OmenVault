import Market from "./Market.json" with {type: "json"};
import MarketFactory from "./MarketFactory.json" with {type: "json"};
import OracleSwarm from "./OracleSwarm.json" with {type: "json"};
import AlloraConsumer from "./AlloraConsumer.json" with {type: "json"};
import AgentRegistry from "./AgentRegistry.json" with {type: "json"};
import DecisionLog from "./DecisionLog.json" with {type: "json"};
import CollateralVault from "./CollateralVault.json" with {type: "json"};
import MockUSDT0 from "./MockUSDT0.json" with {type: "json"};

export const abis = {
    Market,
    MarketFactory,
    OracleSwarm,
    AlloraConsumer,
    AgentRegistry,
    DecisionLog,
    CollateralVault,
    MockUSDT0,
} as const;
