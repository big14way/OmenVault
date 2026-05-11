"use client";

/**
 * useCreateMarket — permissionless market creation via MarketFactory.createMarket.
 * Returns the new Market address parsed from the MarketCreated event.
 */

import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useWalletClient} from "wagmi";
import {decodeEventLog, type Address} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import {marketFactoryAbi} from "../abis";

export interface CreateMarketParams {
    question: string;
    resolutionAt: bigint;
    alloraTopicId: `0x${string}`;
    collateralTier: 0 | 1 | 2;
    minStakeBps?: number;
    liquidityB?: bigint;
}

export function useCreateMarket() {
    const {data: walletClient} = useWalletClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: CreateMarketParams): Promise<Address> => {
            if (!walletClient) throw new Error("wallet not connected");
            if (!deployment.marketFactory) throw new Error("MarketFactory address missing in env");

            const hash = await walletClient.writeContract({
                address: deployment.marketFactory,
                abi: marketFactoryAbi,
                functionName: "createMarket",
                args: [
                    {
                        question: params.question,
                        resolutionAt: params.resolutionAt,
                        alloraTopicId: params.alloraTopicId,
                        collateralTier: params.collateralTier,
                        minStakeBps: params.minStakeBps ?? 0,
                        liquidityB: params.liquidityB ?? 0n,
                    },
                ],
            });
            const receipt = await publicClient.waitForTransactionReceipt({hash});

            for (const log of receipt.logs) {
                try {
                    const parsed = decodeEventLog({
                        abi: marketFactoryAbi,
                        data: log.data,
                        topics: log.topics,
                    });
                    if (parsed.eventName === "MarketCreated") {
                        return (parsed.args as unknown as {market: Address}).market;
                    }
                } catch {}
            }
            throw new Error("MarketCreated event not found in receipt");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["markets", deployment.chainId]});
        },
    });
}
