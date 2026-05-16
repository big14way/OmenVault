"use client";

/**
 * useAgentHeartbeats — derives a per-agent "last seen on chain" map from the
 * DecisionLog event stream. Used to drive online/offline pips on /agents.
 *
 * Returns Map<agentId: number, lastSeenSec: number>. Empty map while loading.
 */

import {useQuery} from "@tanstack/react-query";
import {parseAbiItem, type Address} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";

const POLL_MS = 6_000;
const LOOKBACK_BLOCKS = 50_000n; // ~1 day on Mantle Sepolia (2s blocks)

const DECISION_EVENT = parseAbiItem(
    "event Decision(uint256 indexed agentId, uint8 indexed kind, bytes32 payloadHash, string ipfsCid, uint64 at, address actor)",
);

export interface AgentHeartbeat {
    agentId: number;
    lastSeenSec: number;
    lastKind: number;
}

export function useAgentHeartbeats() {
    const logger = deployment.decisionLog;
    return useQuery({
        queryKey: ["agent-heartbeats", deployment.chainId, logger],
        enabled: Boolean(logger),
        refetchInterval: POLL_MS,
        queryFn: async (): Promise<Map<number, AgentHeartbeat>> => {
            const map = new Map<number, AgentHeartbeat>();
            if (!logger) return map;
            const latest = await publicClient.getBlockNumber();
            const fromBlock = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;
            const logs = await publicClient.getLogs({
                address: logger as Address,
                event: DECISION_EVENT,
                fromBlock,
                toBlock: "latest",
            });
            for (const log of logs) {
                const args = log.args as {agentId: bigint; kind: number; at: bigint};
                const id = Number(args.agentId);
                const at = Number(args.at);
                const cur = map.get(id);
                if (!cur || cur.lastSeenSec < at) {
                    map.set(id, {agentId: id, lastSeenSec: at, lastKind: args.kind});
                }
            }
            return map;
        },
    });
}
