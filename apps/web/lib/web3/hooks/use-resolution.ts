"use client";

/**
 * useResolution — current OracleSwarm voting state for a given market.
 * Reads OracleSwarm.getResolution(market). 6s poll so the UI updates as votes
 * land. The vote tuple comes back as fixed-length [3] arrays; we expose them
 * as length-N arrays trimmed to voteCount for ergonomic rendering.
 *
 * useFinalize — calls OracleSwarm.finalize(market). Anyone can finalize once
 * three votes are in; this lets the UI surface a "Finalize" button that
 * triggers the closing-out + market.resolve cascade.
 */

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useAccount, useChainId, useSwitchChain, useWalletClient} from "wagmi";
import type {Address} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import {oracleSwarmAbi} from "../abis";

const POLL_MS = 6_000;

type VoteCode = 0 | 1 | 2; // YES, NO, INVALID
const VOTE_LABEL: Record<VoteCode, "YES" | "NO" | "INVALID"> = {0: "YES", 1: "NO", 2: "INVALID"};

const chainLabel = (id: number) => (id === 5003 ? "Mantle Sepolia" : id === 31337 ? "Anvil" : `chain ${id}`);

export interface ResolutionView {
    market: Address;
    votes: ("YES" | "NO" | "INVALID")[];
    oracleAgentIds: number[];
    reasoningHashes: `0x${string}`[];
    voteCount: number;
    finalOutcome: "YES" | "NO" | "INVALID" | "UNRESOLVED";
    finalizedAt: number;
    finalized: boolean;
}

export function useResolution(market: Address | undefined) {
    const swarm = deployment.oracleSwarm;
    return useQuery({
        queryKey: ["resolution", deployment.chainId, swarm, market],
        enabled: Boolean(swarm) && Boolean(market),
        refetchInterval: POLL_MS,
        queryFn: async (): Promise<ResolutionView | null> => {
            if (!swarm || !market) return null;
            const raw = (await publicClient.readContract({
                address: swarm,
                abi: oracleSwarmAbi,
                functionName: "getResolution",
                args: [market],
            })) as {
                market: Address;
                votes: readonly [number, number, number];
                oracleAgentIds: readonly [bigint, bigint, bigint];
                reasoningHashes: readonly [`0x${string}`, `0x${string}`, `0x${string}`];
                voteCount: number;
                finalOutcome: number;
                finalizedAt: bigint;
                finalized: boolean;
            };
            const n = Number(raw.voteCount);
            return {
                market,
                votes: raw.votes.slice(0, n).map((v) => VOTE_LABEL[v as VoteCode] ?? "INVALID"),
                oracleAgentIds: raw.oracleAgentIds.slice(0, n).map((a) => Number(a)),
                reasoningHashes: raw.reasoningHashes.slice(0, n) as `0x${string}`[],
                voteCount: n,
                finalOutcome: raw.finalized
                    ? (VOTE_LABEL[raw.finalOutcome as VoteCode] ?? "INVALID")
                    : "UNRESOLVED",
                finalizedAt: Number(raw.finalizedAt) * 1000,
                finalized: raw.finalized,
            };
        },
    });
}

export function useFinalize() {
    const {isConnected} = useAccount();
    const chainId = useChainId();
    const {switchChainAsync} = useSwitchChain();
    const {data: walletClient, refetch: refetchWalletClient} = useWalletClient({
        chainId: deployment.chainId as 5003 | 31337,
    });
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (market: Address) => {
            if (!isConnected) throw new Error("Connect a wallet first.");
            if (!deployment.oracleSwarm) throw new Error("OracleSwarm address missing in env");

            let wc = walletClient;
            if (chainId !== deployment.chainId) {
                await switchChainAsync({chainId: deployment.chainId as 5003 | 31337});
                const refreshed = await refetchWalletClient();
                wc = refreshed.data;
            }
            if (!wc) throw new Error(`Switch your wallet to ${chainLabel(deployment.chainId)} and retry.`);

            // Pre-simulate via our fallback RPCs so we surface real revert
            // reasons (NeedThreeVotes / TieDisagreement / AlreadyFinalized) and
            // hand MetaMask a prepared tx instead of relying on its pre-flight.
            const {request} = await publicClient.simulateContract({
                account: wc.account.address,
                address: deployment.oracleSwarm,
                abi: oracleSwarmAbi,
                functionName: "finalize",
                args: [market],
            });
            const hash = await wc.writeContract(request);
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
        onSuccess: (_r, market) => {
            queryClient.invalidateQueries({queryKey: ["resolution", deployment.chainId, deployment.oracleSwarm, market]});
            queryClient.invalidateQueries({queryKey: ["market", deployment.chainId, market]});
            queryClient.invalidateQueries({queryKey: ["markets", deployment.chainId]});
            queryClient.invalidateQueries({queryKey: ["portfolio", deployment.chainId]});
        },
    });
}
