"use client";

/**
 * useDecisions — DecisionLog event stream. Backfills the last `fromBlockOffset` blocks
 * and refetches every 6s. Returns Decision rows in the display shape used by /audit.
 */

import {useQuery} from "@tanstack/react-query";
import {parseAbiItem, type Address} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import type {Decision, DecisionKind} from "@/lib/types";

const POLL_MS = 6_000;
// Mantle Sepolia produces ~1 block every 2s. 50_000 blocks ≈ 27h — wide enough
// that a demo recording stays watchable through the next day. Bump higher only
// if a single RPC `eth_getLogs` window can handle it.
const LOOKBACK_BLOCKS = 50_000n;

const DECISION_EVENT = parseAbiItem(
    "event Decision(uint256 indexed agentId, uint8 indexed kind, bytes32 payloadHash, string ipfsCid, uint64 at, address actor)",
);

const KINDS: DecisionKind[] = ["ENTER", "VOTE", "REASONING", "REASONING"]; // contract: TRADE, ORACLE_VOTE, SIGNAL, OTHER

export function useDecisions() {
    const logger = deployment.decisionLog;
    return useQuery({
        queryKey: ["decisions", deployment.chainId, logger],
        enabled: Boolean(logger),
        refetchInterval: POLL_MS,
        queryFn: async (): Promise<Decision[]> => {
            if (!logger) return [];
            const latest = await publicClient.getBlockNumber();
            const fromBlock = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;
            const logs = await publicClient.getLogs({
                address: logger as Address,
                event: DECISION_EVENT,
                fromBlock,
                toBlock: "latest",
            });
            return logs
                .reverse()
                .map((l, i): Decision => {
                    const args = l.args as {
                        agentId: bigint;
                        kind: number;
                        payloadHash: `0x${string}`;
                        ipfsCid: string;
                        at: bigint;
                        actor: Address;
                    };
                    const kind: DecisionKind = KINDS[args.kind] ?? "REASONING";
                    return {
                        id: `${l.transactionHash}-${l.logIndex}`,
                        timestamp: Number(args.at) * 1000,
                        agentId: Number(args.agentId),
                        agentType: kind === "VOTE" ? "OracleNode" : kind === "ENTER" ? "Trader" : "System",
                        kind,
                        marketId: undefined,
                        payload: {
                            ipfsHash: args.ipfsCid,
                        },
                        txHash: l.transactionHash,
                    };
                });
        },
    });
}
