"use client";

/**
 * useCanVote — does the connected wallet meet OracleSwarm.submitVote's two
 * preconditions?
 *
 *   1. hasRole(ORACLE_ROLE, address) on OracleSwarm
 *   2. AgentRegistry.tokenIdOf(address) != 0 (registered ERC-8004 agent)
 *
 * Used to gate the manual "Submit vote" UI on /swarm so normal user wallets
 * don't bounce off NotOracle / AgentNotRegistered reverts.
 */

import {useQuery} from "@tanstack/react-query";
import {useAccount} from "wagmi";
import {publicClient} from "../client";
import {deployment} from "../config";
import {agentRegistryAbi, oracleSwarmAbi} from "../abis";

export interface CanVote {
    eligible: boolean;
    hasRole: boolean;
    agentId: number;
}

export function useCanVote() {
    const {address, isConnected} = useAccount();
    const swarm = deployment.oracleSwarm;
    const registry = deployment.agentRegistry;
    return useQuery({
        queryKey: ["can-vote", deployment.chainId, swarm, registry, address],
        enabled: Boolean(isConnected && address && swarm && registry),
        staleTime: 30_000,
        queryFn: async (): Promise<CanVote> => {
            if (!address || !swarm || !registry) {
                return {eligible: false, hasRole: false, agentId: 0};
            }
            const [oracleRole, agentId] = await Promise.all([
                publicClient.readContract({
                    address: swarm,
                    abi: oracleSwarmAbi,
                    functionName: "ORACLE_ROLE",
                }) as Promise<`0x${string}`>,
                publicClient.readContract({
                    address: registry,
                    abi: agentRegistryAbi,
                    functionName: "tokenIdOf",
                    args: [address],
                }) as Promise<bigint>,
            ]);
            const has = (await publicClient.readContract({
                address: swarm,
                abi: oracleSwarmAbi,
                functionName: "hasRole",
                args: [oracleRole, address],
            })) as boolean;
            const id = Number(agentId);
            return {eligible: has && id > 0, hasRole: has, agentId: id};
        },
    });
}
