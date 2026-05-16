"use client";

/**
 * useForecasts — recent ForecastWritten events from AlloraConsumer. Surfaces
 * the off-chain Allora writer bot's activity in the UI even though it doesn't
 * register on the DecisionLog stream.
 *
 * Each entry includes the topic (numeric for known IDs), the WAD probability,
 * the timestamp, the attestor address, and the tx hash for "view on explorer".
 */

import {useQuery} from "@tanstack/react-query";
import {parseAbiItem, type Address} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";

const POLL_MS = 8_000;
const LOOKBACK_BLOCKS = 50_000n;

const FORECAST_EVENT = parseAbiItem(
    "event ForecastWritten(bytes32 indexed topicId, uint256 valueE18, uint64 timestamp, address attestor)",
);

const TOPIC_LABELS: Record<string, string> = {
    "1": "BTC/USD",
    "8": "SOL/USD",
    "14": "ETH/USD",
};

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

function labelForTopic(topicIdRaw: `0x${string}`): string {
    try {
        const numeric = BigInt(topicIdRaw).toString();
        return TOPIC_LABELS[numeric] ?? `topic ${numeric}`;
    } catch {
        return "unknown topic";
    }
}

export function useForecasts() {
    const consumer = deployment.alloraConsumer;
    return useQuery({
        queryKey: ["forecasts", deployment.chainId, consumer],
        enabled: Boolean(consumer),
        refetchInterval: POLL_MS,
        queryFn: async (): Promise<ForecastEntry[]> => {
            if (!consumer) return [];
            const latest = await publicClient.getBlockNumber();
            const fromBlock = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;
            const logs = await publicClient.getLogs({
                address: consumer as Address,
                event: FORECAST_EVENT,
                fromBlock,
                toBlock: "latest",
            });
            return logs
                .reverse()
                .map((log): ForecastEntry => {
                    const args = log.args as {
                        topicId: `0x${string}`;
                        valueE18: bigint;
                        timestamp: bigint;
                        attestor: Address;
                    };
                    return {
                        txHash: log.transactionHash,
                        logIndex: log.logIndex,
                        topicIdRaw: args.topicId,
                        topicLabel: labelForTopic(args.topicId),
                        valueE18: args.valueE18,
                        valueFloat: Number(args.valueE18) / 1e18,
                        timestampSec: Number(args.timestamp),
                        attestor: args.attestor,
                    };
                })
                .slice(0, 20);
        },
    });
}
