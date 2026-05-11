"use client";

/**
 * useMarket — single market detail. Same shape `useMarkets` returns per-row,
 * just for one address.
 */

import {useQuery} from "@tanstack/react-query";
import type {Address} from "viem";
import {isAddress} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import {marketAbi, collateralVaultAbi} from "../abis";
import {toMarket, type OnChainMarket} from "../adapters";
import type {Market} from "@/lib/types";

const POLL_MS = 8_000;

export function useMarket(idOrAddress: string | undefined) {
    const isAddr = !!idOrAddress && isAddress(idOrAddress);
    return useQuery({
        queryKey: ["market", deployment.chainId, idOrAddress],
        enabled: Boolean(idOrAddress) && isAddr,
        refetchInterval: POLL_MS,
        queryFn: async (): Promise<Market | null> => {
            if (!isAddr) return null;
            const m = idOrAddress as Address;
            const reads = await publicClient.multicall({
                contracts: [
                    {address: m, abi: marketAbi, functionName: "question"},
                    {address: m, abi: marketAbi, functionName: "resolutionAt"},
                    {address: m, abi: marketAbi, functionName: "alloraTopicId"},
                    {address: m, abi: marketAbi, functionName: "collateralTier"},
                    {address: m, abi: marketAbi, functionName: "yesSharesWad"},
                    {address: m, abi: marketAbi, functionName: "noSharesWad"},
                    {address: m, abi: marketAbi, functionName: "currentPrice"},
                    {address: m, abi: marketAbi, functionName: "totalStakedUsdt0"},
                    {address: m, abi: marketAbi, functionName: "outcome"},
                    {address: m, abi: marketAbi, functionName: "collateralVault"},
                ],
                allowFailure: false,
            });
            const [
                question,
                resolutionAt,
                topicId,
                tier,
                yes,
                no,
                price,
                staked,
                outcome,
                vault,
            ] = reads as readonly [
                string,
                bigint,
                `0x${string}`,
                number,
                bigint,
                bigint,
                readonly [bigint, bigint],
                bigint,
                number,
                Address,
            ];
            const [yesPriceE18, noPriceE18] = price;

            let vaultValueUsdt0 = 0n;
            let principalUsdt0 = 0n;
            try {
                const [v, p] = (await publicClient.multicall({
                    contracts: [
                        {address: vault, abi: collateralVaultAbi, functionName: "vaultValue"},
                        {address: vault, abi: collateralVaultAbi, functionName: "principalUsdt0"},
                    ],
                    allowFailure: false,
                })) as [bigint, bigint];
                vaultValueUsdt0 = v;
                principalUsdt0 = p;
            } catch {}

            const oc: OnChainMarket = {
                address: m,
                question,
                resolutionAt,
                alloraTopicId: topicId,
                collateralTier: Number(tier),
                yesSharesWad: yes,
                noSharesWad: no,
                yesPriceE18,
                noPriceE18,
                totalStakedUsdt0: staked,
                outcome: Number(outcome),
                vaultValueUsdt0,
                principalUsdt0,
            };
            return toMarket(oc);
        },
    });
}
