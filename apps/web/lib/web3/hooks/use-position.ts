"use client";

/**
 * usePosition — the connected wallet's position in a given market.
 * Returns null when there is no wallet or no entry yet.
 */

import {useQuery} from "@tanstack/react-query";
import {useAccount} from "wagmi";
import type {Address} from "viem";
import {isAddress} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import {marketAbi} from "../abis";
import type {Position} from "@/lib/types";

const POLL_MS = 8_000;

export function usePosition(marketAddress: string | undefined) {
    const {address: bettor} = useAccount();
    const isAddr = !!marketAddress && isAddress(marketAddress);
    return useQuery({
        queryKey: ["position", deployment.chainId, marketAddress, bettor],
        enabled: Boolean(bettor) && isAddr,
        refetchInterval: POLL_MS,
        queryFn: async (): Promise<Position | null> => {
            if (!bettor || !isAddr) return null;
            const result = (await publicClient.readContract({
                address: marketAddress as Address,
                abi: marketAbi,
                functionName: "positions",
                args: [bettor],
            })) as readonly [
                bigint, // agentId
                bigint, // yesSharesWad
                bigint, // noSharesWad
                bigint, // stakedUsdt0
                bigint, // enteredAt
                `0x${string}`, // alloraSnapshot
                `0x${string}`, // nansenSnapshot
                boolean, // claimed
            ];
            const [, yesShares, noShares, staked, enteredAt] = result;
            if (staked === 0n) return null;

            // Prefer whichever side has shares; in this v1 a bettor takes one side per entry.
            const side: "YES" | "NO" = yesShares >= noShares ? "YES" : "NO";
            const shares = side === "YES" ? yesShares : noShares;
            const stakedUsdt0 = Number(staked) / 1e6;
            const sharesFloat = Number(shares) / 1e18;
            const enteredPrice = sharesFloat > 0 ? stakedUsdt0 / sharesFloat : 0.5;

            return {
                marketId: marketAddress,
                bettor,
                side,
                shares: sharesFloat,
                stakedUsdt0,
                enteredAt: Number(enteredAt) * 1000,
                enteredPrice,
            };
        },
    });
}
