/**
 * Chain + RPC config and contract addresses, read from NEXT_PUBLIC_* env at build time.
 *
 * Two chains are supported:
 *   - Mantle Sepolia (chain id 5003) — production demo target
 *   - Anvil          (chain id 31337) — local dev (fallback if NEXT_PUBLIC_CHAIN_ID is unset)
 */

import {defineChain} from "viem";
import {mantleSepoliaTestnet} from "viem/chains";

export const anvilChain = defineChain({
    id: 31337,
    name: "Anvil",
    nativeCurrency: {name: "Ether", symbol: "ETH", decimals: 18},
    rpcUrls: {default: {http: ["http://localhost:8545"]}},
    testnet: true,
});

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
export const activeChain = chainId === 5003 ? mantleSepoliaTestnet : anvilChain;

export const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL ??
    (chainId === 5003 ? "https://rpc.sepolia.mantle.xyz" : "http://localhost:8545");

/**
 * Deployed contract addresses. All optional at build time; pages that need a missing
 * address will surface that to the user (`useDeployment().missing` returns the list).
 */
export interface Deployment {
    chainId: number;
    marketFactory?: `0x${string}`;
    agentRegistry?: `0x${string}`;
    oracleSwarm?: `0x${string}`;
    alloraConsumer?: `0x${string}`;
    decisionLog?: `0x${string}`;
    usdt0?: `0x${string}`;
    usdy?: `0x${string}`;
    sUSDe?: `0x${string}`;
}

function envAddr(key: string): `0x${string}` | undefined {
    const v = process.env[key];
    if (!v || !v.startsWith("0x") || v.length !== 42) return undefined;
    return v as `0x${string}`;
}

export const deployment: Deployment = {
    chainId,
    marketFactory: envAddr("NEXT_PUBLIC_MARKET_FACTORY_ADDRESS"),
    agentRegistry: envAddr("NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS"),
    oracleSwarm: envAddr("NEXT_PUBLIC_ORACLE_SWARM_ADDRESS"),
    alloraConsumer: envAddr("NEXT_PUBLIC_ALLORA_CONSUMER_ADDRESS"),
    decisionLog: envAddr("NEXT_PUBLIC_DECISION_LOG_ADDRESS"),
    usdt0: envAddr("NEXT_PUBLIC_USDT0_ADDRESS"),
    usdy: envAddr("NEXT_PUBLIC_USDY_ADDRESS"),
    sUSDe: envAddr("NEXT_PUBLIC_SUSDE_ADDRESS"),
};

export function missingAddresses(): string[] {
    const required: (keyof Deployment)[] = [
        "marketFactory",
        "agentRegistry",
        "oracleSwarm",
        "decisionLog",
        "usdt0",
    ];
    return required.filter((k) => !deployment[k]);
}
