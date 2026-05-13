"use client";

/**
 * usePortfolio — every active or claimable position the connected wallet holds.
 * Multicalls Market.positions(bettor) across the markets list passed in (typically
 * from useMarkets), filters out zero-stake entries, and joins each row with its
 * Market for rendering.
 */

import {useQuery} from "@tanstack/react-query";
import {useAccount} from "wagmi";
import type {Address} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import {marketAbi} from "../abis";
import type {Market, Position} from "@/lib/types";

const POLL_MS = 10_000;

export interface PortfolioEntry {
    market: Market;
    position: Position;
    claimed: boolean;
}

export function usePortfolio(markets: Market[] | undefined) {
    const {address: bettor} = useAccount();
    const marketAddrs = (markets ?? [])
        .map((m) => m.address)
        .filter((a) => a && a !== "0x" + "0".repeat(40));

    return useQuery({
        queryKey: ["portfolio", deployment.chainId, bettor, marketAddrs],
        enabled: Boolean(bettor) && marketAddrs.length > 0,
        refetchInterval: POLL_MS,
        queryFn: async (): Promise<PortfolioEntry[]> => {
            if (!bettor || marketAddrs.length === 0) return [];

            const results = await publicClient.multicall({
                contracts: marketAddrs.map((m) => ({
                    address: m as Address,
                    abi: marketAbi as any,
                    functionName: "positions" as const,
                    args: [bettor],
                })),
                allowFailure: true,
            });

            const entries: PortfolioEntry[] = [];
            for (let i = 0; i < results.length; i++) {
                const r = results[i];
                if (r.status !== "success") continue;
                const raw = r.result as unknown as readonly [
                    bigint, bigint, bigint, bigint, bigint, `0x${string}`, `0x${string}`, boolean
                ];
                const [, yesShares, noShares, staked, enteredAt, , , claimed] = raw;
                if (staked === 0n) continue;

                const side: "YES" | "NO" = yesShares >= noShares ? "YES" : "NO";
                const shares = side === "YES" ? yesShares : noShares;
                const stakedUsdt0 = Number(staked) / 1e6;
                const sharesFloat = Number(shares) / 1e18;
                const enteredPrice = sharesFloat > 0 ? stakedUsdt0 / sharesFloat : 0.5;

                const market = markets!.find((m) => m.address === marketAddrs[i])!;
                entries.push({
                    market,
                    position: {
                        marketId: market.address,
                        bettor,
                        side,
                        shares: sharesFloat,
                        stakedUsdt0,
                        enteredAt: Number(enteredAt) * 1000,
                        enteredPrice,
                    },
                    claimed,
                });
            }
            return entries.sort((a, b) => b.position.enteredAt - a.position.enteredAt);
        },
    });
}
