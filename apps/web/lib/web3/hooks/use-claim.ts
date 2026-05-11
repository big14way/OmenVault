"use client";

/**
 * useClaim — post-resolution payout. Anyone with a winning position calls Market.claim().
 */

import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useWalletClient} from "wagmi";
import type {Address} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import {marketAbi} from "../abis";

export function useClaim() {
    const {data: walletClient} = useWalletClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (market: Address) => {
            if (!walletClient) throw new Error("wallet not connected");
            const hash = await walletClient.writeContract({
                address: market,
                abi: marketAbi,
                functionName: "claim",
                args: [],
            });
            return publicClient.waitForTransactionReceipt({hash});
        },
        onSuccess: (_r, market) => {
            queryClient.invalidateQueries({queryKey: ["market", deployment.chainId, market]});
            queryClient.invalidateQueries({queryKey: ["position", deployment.chainId, market]});
        },
    });
}
