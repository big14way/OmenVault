"use client";

/**
 * useForecasts — latest forecast per known Allora topic from AlloraConsumer.
 *
 * Reads contract state via `getLatest(bytes32)` for each known topic ID rather
 * than `eth_getLogs`. Public RPCs (drpc free tier, mantle.xyz) silently fail
 * or cap log queries, which left the UI blank when the chain in fact had the
 * data. State reads always work and return exactly what `getLatest` stored.
 */

import {useQuery} from "@tanstack/react-query";
import {type Address} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";

const POLL_MS = 8_000;

const ALLORA_CONSUMER_ABI = [
    {
        type: "function",
        name: "getLatest",
        stateMutability: "view",
        inputs: [{name: "topicId", type: "bytes32"}],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    {name: "topicId", type: "bytes32"},
                    {name: "valueE18", type: "uint256"},
                    {name: "timestamp", type: "uint64"},
                    {name: "attestor", type: "address"},
                ],
            },
        ],
    },
] as const;

const TOPIC_LABELS: Record<string, string> = {
    "1": "BTC/USD",
    "8": "SOL/USD",
    "14": "ETH/USD",
};

const KNOWN_TOPICS = Object.keys(TOPIC_LABELS).map((n) => Number(n));

function toBytes32(numeric: number): `0x${string}` {
    return `0x${numeric.toString(16).padStart(64, "0")}` as `0x${string}`;
}

export interface ForecastEntry {
    txHash: `0x${string}`;
    logIndex: number;
    topicIdRaw: `0x${string}`;
    topicLabel: string;
    valueE18: bigint;
    valueFloat: number;
    timestampSec: number;
    attestor: Address;
}

export function useForecasts() {
    const consumer = deployment.alloraConsumer;
    return useQuery({
        queryKey: ["forecasts", deployment.chainId, consumer],
        enabled: Boolean(consumer),
        refetchInterval: POLL_MS,
        queryFn: async (): Promise<ForecastEntry[]> => {
            if (!consumer) return [];
            const results = await Promise.all(
                KNOWN_TOPICS.map(async (topicNum) => {
                    try {
                        const topicIdRaw = toBytes32(topicNum);
                        const f = (await publicClient.readContract({
                            address: consumer as Address,
                            abi: ALLORA_CONSUMER_ABI,
                            functionName: "getLatest",
                            args: [topicIdRaw],
                        })) as {
                            topicId: `0x${string}`;
                            valueE18: bigint;
                            timestamp: bigint;
                            attestor: Address;
                        };
                        if (f.timestamp === 0n) return null;
                        return {
                            // No event log available without eth_getLogs; the
                            // page consumers only use the topic + value fields.
                            txHash: "0x" as `0x${string}`,
                            logIndex: 0,
                            topicIdRaw,
                            topicLabel: TOPIC_LABELS[String(topicNum)] ?? `topic ${topicNum}`,
                            valueE18: f.valueE18,
                            valueFloat: Number(f.valueE18) / 1e18,
                            timestampSec: Number(f.timestamp),
                            attestor: f.attestor,
                        } satisfies ForecastEntry;
                    } catch {
                        return null;
                    }
                }),
            );
            return results
                .filter((r): r is ForecastEntry => r !== null)
                .sort((a, b) => b.timestampSec - a.timestampSec);
        },
    });
}
