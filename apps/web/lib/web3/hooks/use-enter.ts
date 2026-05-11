"use client";

/**
 * useEnter — approve USDT0 (if needed) then call Market.enter(side, amountUsdt0, ...).
 * Caller passes raw USDT0 base units (6 decimals).
 */

import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useAccount, useWalletClient} from "wagmi";
import type {Address} from "viem";
import {maxUint256, keccak256, toBytes} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import {marketAbi, usdt0Abi} from "../abis";

export interface EnterParams {
    market: Address;
    side: 0 | 1;
    amountUsdt0: bigint;
    alloraSnapshot?: `0x${string}`;
    nansenSnapshot?: `0x${string}`;
}

const zero = `0x${"00".repeat(32)}` as `0x${string}`;

export function useEnter() {
    const {address: bettor} = useAccount();
    const {data: walletClient} = useWalletClient();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: EnterParams) => {
            if (!bettor || !walletClient) throw new Error("wallet not connected");
            if (!deployment.usdt0) throw new Error("USDT0 address missing in env");

            const allowance = (await publicClient.readContract({
                address: deployment.usdt0,
                abi: usdt0Abi,
                functionName: "allowance",
                args: [bettor, params.market],
            })) as bigint;

            if (allowance < params.amountUsdt0) {
                const approveHash = await walletClient.writeContract({
                    address: deployment.usdt0,
                    abi: usdt0Abi,
                    functionName: "approve",
                    args: [params.market, maxUint256],
                });
                await publicClient.waitForTransactionReceipt({hash: approveHash});
            }

            const alloraSnap = params.alloraSnapshot ?? keccak256(toBytes("allora:no-forecast"));
            const nansenSnap = params.nansenSnapshot ?? zero;

            const hash = await walletClient.writeContract({
                address: params.market,
                abi: marketAbi,
                functionName: "enter",
                args: [params.side, params.amountUsdt0, alloraSnap, nansenSnap],
            });
            const receipt = await publicClient.waitForTransactionReceipt({hash});
            return receipt;
        },
        onSuccess: (_r, params) => {
            queryClient.invalidateQueries({queryKey: ["market", deployment.chainId, params.market]});
            queryClient.invalidateQueries({queryKey: ["markets", deployment.chainId]});
            queryClient.invalidateQueries({queryKey: ["position", deployment.chainId, params.market]});
        },
    });
}
