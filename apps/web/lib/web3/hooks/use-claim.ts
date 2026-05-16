"use client";

/**
 * useClaim — post-resolution payout. Anyone with a winning position calls Market.claim().
 */

import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useAccount, useChainId, useSwitchChain, useWalletClient} from "wagmi";
import type {Address} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import {marketAbi} from "../abis";

const chainLabel = (id: number) => (id === 5003 ? "Mantle Sepolia" : id === 31337 ? "Anvil" : `chain ${id}`);

export function useClaim() {
    const {isConnected} = useAccount();
    const chainId = useChainId();
    const {switchChainAsync} = useSwitchChain();
    const {data: walletClient, refetch: refetchWalletClient} = useWalletClient({
        chainId: deployment.chainId as 5003 | 31337,
    });
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (market: Address) => {
            if (!isConnected) throw new Error("Wallet not connected — click Connect Wallet first.");
            let wc = walletClient;
            if (chainId !== deployment.chainId) {
                await switchChainAsync({chainId: deployment.chainId as 5003 | 31337});
                const refreshed = await refetchWalletClient();
                wc = refreshed.data;
            }
            if (!wc) throw new Error(`Switch your wallet to ${chainLabel(deployment.chainId)} and retry.`);
            const hash = await wc.writeContract({
                address: market,
                abi: marketAbi,
                functionName: "claim",
                args: [],
            });
            return publicClient.waitForTransactionReceipt({
                hash,
                retryCount: 30,
                pollingInterval: 4_000,
            });
        },
        onSuccess: (_r, market) => {
            queryClient.invalidateQueries({queryKey: ["market", deployment.chainId, market]});
            queryClient.invalidateQueries({queryKey: ["position", deployment.chainId, market]});
            queryClient.invalidateQueries({queryKey: ["portfolio", deployment.chainId]});
        },
    });
}
