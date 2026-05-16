"use client";

/**
 * USDT0 read + write hooks. Balance polls every 8s; faucet uses the unrestricted
 * `mint` on MockUSDT0 (testnet only — the real USDT0 mainnet contract has no public mint).
 */

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useAccount, useChainId, useSwitchChain, useWalletClient} from "wagmi";
import {toast} from "sonner";
import {publicClient} from "../client";
import {deployment} from "../config";
import {usdt0Abi} from "../abis";

const POLL_MS = 8_000;
const FAUCET_AMOUNT_UNITS = 1_000n * 1_000_000n; // 1,000 USDT0 (6 decimals)

const chainLabel = (id: number) => (id === 5003 ? "Mantle Sepolia" : id === 31337 ? "Anvil" : `chain ${id}`);

export function useUsdt0Balance() {
    const {address} = useAccount();
    return useQuery({
        queryKey: ["usdt0-balance", deployment.chainId, deployment.usdt0, address],
        enabled: Boolean(address) && Boolean(deployment.usdt0),
        refetchInterval: POLL_MS,
        queryFn: async (): Promise<{raw: bigint; float: number}> => {
            if (!address || !deployment.usdt0) return {raw: 0n, float: 0};
            const raw = (await publicClient.readContract({
                address: deployment.usdt0,
                abi: usdt0Abi,
                functionName: "balanceOf",
                args: [address],
            })) as bigint;
            return {raw, float: Number(raw) / 1_000_000};
        },
    });
}

export function useFaucet() {
    const {address, isConnected} = useAccount();
    const chainId = useChainId();
    const {switchChainAsync} = useSwitchChain();
    const {data: walletClient, refetch: refetchWalletClient} = useWalletClient({
        chainId: deployment.chainId as 5003 | 31337,
    });
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            if (!isConnected || !address) throw new Error("Connect a wallet first.");
            if (!deployment.usdt0) throw new Error("USDT0 address missing in env");

            let wc = walletClient;
            if (chainId !== deployment.chainId) {
                await switchChainAsync({chainId: deployment.chainId as 5003 | 31337});
                const refreshed = await refetchWalletClient();
                wc = refreshed.data;
            }
            if (!wc) throw new Error(`Switch your wallet to ${chainLabel(deployment.chainId)} and retry.`);

            const hash = await wc.writeContract({
                address: deployment.usdt0,
                abi: usdt0Abi,
                functionName: "mint",
                args: [address, FAUCET_AMOUNT_UNITS],
            });
            try {
                await publicClient.waitForTransactionReceipt({
                    hash,
                    retryCount: 30,
                    pollingInterval: 4_000,
                });
                return {hash, slowReceipt: false};
            } catch {
                return {hash, slowReceipt: true};
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["usdt0-balance", deployment.chainId]});
        },
        onError: (err: Error) => {
            toast.error("Faucet failed", {
                description: err.message?.slice(0, 100) ?? "unknown error",
            });
        },
    });
}
