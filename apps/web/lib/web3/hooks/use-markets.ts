"use client";

/**
 * useMarkets — list every market the factory has deployed, hydrated with the
 * per-market state the frontend cards need. One react-query keyed on the chain
 * id + factory address, with a 10s refetch so the live rail stays moving.
 */

import {useQuery} from "@tanstack/react-query";
import type {Address} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import {marketFactoryAbi, marketAbi, collateralVaultAbi} from "../abis";
import {toMarket, type OnChainMarket} from "../adapters";
import type {Market} from "@/lib/types";

const POLL_MS = 10_000;

async function fetchOnChain(factory: Address): Promise<OnChainMarket[]> {
    const length = (await publicClient.readContract({
        address: factory,
        abi: marketFactoryAbi as any,
        functionName: "marketsLength",
    })) as bigint;

    // Fetch addresses serially-ish via a multicall of allMarkets(i).
    const addressCalls = Array.from({length: Number(length)}, (_, i) => ({
        address: factory,
        abi: marketFactoryAbi as any,
        functionName: "allMarkets" as const,
        args: [BigInt(i)],
    }));
    const addressResults = await publicClient.multicall({contracts: addressCalls, allowFailure: false});
    const addresses = addressResults as readonly Address[];

    if (addresses.length === 0) return [];

    // For each market, read the fields the card needs.
    const reads = addresses.flatMap((m) => [
        {address: m, abi: marketAbi as any, functionName: "question" as const},
        {address: m, abi: marketAbi as any, functionName: "resolutionAt" as const},
        {address: m, abi: marketAbi as any, functionName: "alloraTopicId" as const},
        {address: m, abi: marketAbi as any, functionName: "collateralTier" as const},
        {address: m, abi: marketAbi as any, functionName: "yesSharesWad" as const},
        {address: m, abi: marketAbi as any, functionName: "noSharesWad" as const},
        {address: m, abi: marketAbi as any, functionName: "currentPrice" as const},
        {address: m, abi: marketAbi as any, functionName: "totalStakedUsdt0" as const},
        {address: m, abi: marketAbi as any, functionName: "outcome" as const},
        {address: m, abi: marketAbi as any, functionName: "collateralVault" as const},
    ]);

    const results = await publicClient.multicall({contracts: reads, allowFailure: true});

    // Walk results in groups of 10.
    const PER = 10;
    const ocMarkets: OnChainMarket[] = [];
    for (let i = 0; i < addresses.length; i++) {
        const slice = results.slice(i * PER, i * PER + PER);
        const allOk = slice.every((r) => r.status === "success");
        if (!allOk) continue;

        const [question, resolutionAt, topicId, tier, yes, no, price, staked, outcome, vault] =
            slice.map((r: any) => r.result);
        const [yesPriceE18, noPriceE18] = price as readonly [bigint, bigint];

        // Vault value — extra call (we already have its address; do per-market to avoid blowing batch size).
        let vaultValueUsdt0 = 0n;
        let principalUsdt0 = 0n;
        try {
            const [v, p] = (await publicClient.multicall({
                contracts: [
                    {address: vault as Address, abi: collateralVaultAbi as any, functionName: "vaultValue"},
                    {address: vault as Address, abi: collateralVaultAbi as any, functionName: "principalUsdt0"},
                ],
                allowFailure: false,
            })) as [bigint, bigint];
            vaultValueUsdt0 = v;
            principalUsdt0 = p;
        } catch {}

        ocMarkets.push({
            address: addresses[i],
            question: String(question),
            resolutionAt: BigInt(resolutionAt as any),
            alloraTopicId: topicId as `0x${string}`,
            collateralTier: Number(tier),
            yesSharesWad: yes as bigint,
            noSharesWad: no as bigint,
            yesPriceE18,
            noPriceE18,
            totalStakedUsdt0: staked as bigint,
            outcome: Number(outcome),
            vaultValueUsdt0,
            principalUsdt0,
        });
    }
    return ocMarkets;
}

export function useMarkets() {
    const factory = deployment.marketFactory;
    return useQuery({
        queryKey: ["markets", deployment.chainId, factory],
        enabled: Boolean(factory),
        refetchInterval: POLL_MS,
        queryFn: async (): Promise<Market[]> => {
            if (!factory) return [];
            const onChain = await fetchOnChain(factory);
            return onChain.map((oc) => toMarket(oc));
        },
    });
}
