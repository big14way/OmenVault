"use client";

/**
 * useEnter — approve USDT0 (if needed) then call Market.enter(side, amountUsdt0, ...).
 * Caller passes raw USDT0 base units (6 decimals).
 */

import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useAccount, useChainId, useSwitchChain, useWalletClient} from "wagmi";
import type {Address} from "viem";
import {maxUint256, keccak256, toBytes} from "viem";
import {toast} from "sonner";
import {publicClient} from "../client";
import {deployment} from "../config";
import {marketAbi, usdt0Abi} from "../abis";

const TOAST_ID = "enter";

const chainLabel = (id: number) => (id === 5003 ? "Mantle Sepolia" : id === 31337 ? "Anvil" : `chain ${id}`);

export interface EnterParams {
    market: Address;
    side: 0 | 1;
    amountUsdt0: bigint;
    alloraSnapshot?: `0x${string}`;
    nansenSnapshot?: `0x${string}`;
}

const zero = `0x${"00".repeat(32)}` as `0x${string}`;

export function useEnter() {
    const {address: bettor, isConnected} = useAccount();
    const chainId = useChainId();
    const {switchChainAsync} = useSwitchChain();
    const {data: walletClient, refetch: refetchWalletClient} = useWalletClient({
        chainId: deployment.chainId as 5003 | 31337,
    });
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: EnterParams) => {
            if (!isConnected || !bettor) throw new Error("Wallet not connected — click Connect Wallet first.");
            if (!deployment.usdt0) throw new Error("USDT0 address missing in env");

            let wc = walletClient;
            if (chainId !== deployment.chainId) {
                await switchChainAsync({chainId: deployment.chainId as 5003 | 31337});
                const refreshed = await refetchWalletClient();
                wc = refreshed.data;
            }
            if (!wc) {
                throw new Error(`Switch your wallet to ${chainLabel(deployment.chainId)} and retry.`);
            }

            const allowance = (await publicClient.readContract({
                address: deployment.usdt0,
                abi: usdt0Abi,
                functionName: "allowance",
                args: [bettor, params.market],
            })) as bigint;

            if (allowance < params.amountUsdt0) {
                toast.loading("Step 1/2 — confirm USDT0 approval in MetaMask…", {id: TOAST_ID});
                const approveHash = await wc.writeContract({
                    address: deployment.usdt0,
                    abi: usdt0Abi,
                    functionName: "approve",
                    args: [params.market, maxUint256],
                });
                toast.loading("Approval submitted. Waiting for receipt…", {id: TOAST_ID});
                await publicClient.waitForTransactionReceipt({
                    hash: approveHash,
                    retryCount: 30,
                    pollingInterval: 4_000,
                });
            }

            const alloraSnap = params.alloraSnapshot ?? keccak256(toBytes("allora:no-forecast"));
            const nansenSnap = params.nansenSnapshot ?? zero;

            toast.loading("Step 2/2 — confirm entry in MetaMask…", {id: TOAST_ID});
            const hash = await wc.writeContract({
                address: params.market,
                abi: marketAbi,
                functionName: "enter",
                args: [params.side, params.amountUsdt0, alloraSnap, nansenSnap],
            });
            toast.loading("Entry submitted. Waiting for confirmation…", {id: TOAST_ID});
            try {
                const receipt = await publicClient.waitForTransactionReceipt({
                    hash,
                    retryCount: 30,
                    pollingInterval: 4_000,
                });
                return {receipt, hash, slowReceipt: false};
            } catch (err) {
                // RPC was slow to surface the receipt. The tx is on chain — surface
                // the hash so the caller can soft-toast and let polling catch up.
                return {receipt: null, hash, slowReceipt: true};
            }
        },
        onSuccess: (_r, params) => {
            queryClient.invalidateQueries({queryKey: ["market", deployment.chainId, params.market]});
            queryClient.invalidateQueries({queryKey: ["markets", deployment.chainId]});
            queryClient.invalidateQueries({queryKey: ["position", deployment.chainId, params.market]});
            queryClient.invalidateQueries({queryKey: ["portfolio", deployment.chainId]});
        },
    });
}
