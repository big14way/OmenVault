"use client";

/**
 * useAgents — every ERC-8004 agent registered. Iterates nextTokenId then multicalls.
 */

import {useQuery} from "@tanstack/react-query";
import type {Address} from "viem";
import {publicClient} from "../client";
import {deployment} from "../config";
import {agentRegistryAbi} from "../abis";
import type {Agent, AgentType} from "@/lib/types";

const POLL_MS = 15_000;
const TYPE_NAMES: AgentType[] = ["Bettor", "Trader", "OracleNode"];

export function useAgents() {
    const registry = deployment.agentRegistry;
    return useQuery({
        queryKey: ["agents", deployment.chainId, registry],
        enabled: Boolean(registry),
        refetchInterval: POLL_MS,
        queryFn: async (): Promise<Agent[]> => {
            if (!registry) return [];
            const next = (await publicClient.readContract({
                address: registry as Address,
                abi: agentRegistryAbi,
                functionName: "nextTokenId",
            })) as bigint;
            const total = Number(next) - 1;
            if (total <= 0) return [];

            const calls = Array.from({length: total}, (_, i) => ({
                address: registry as Address,
                abi: agentRegistryAbi,
                functionName: "agents" as const,
                args: [BigInt(i + 1)],
            }));
            const results = await publicClient.multicall({contracts: calls, allowFailure: true});

            return results.flatMap((r, idx) => {
                if (r.status !== "success") return [];
                const [agentType, controller, , reputation, registeredAt] = r.result as readonly [
                    number,
                    Address,
                    string,
                    bigint,
                    bigint,
                ];
                return [
                    {
                        id: idx + 1,
                        type: TYPE_NAMES[agentType] ?? "Bettor",
                        owner: controller,
                        reputation: Number(reputation),
                        lastActionAt: Number(registeredAt) * 1000,
                        createdAt: Number(registeredAt) * 1000,
                    } as Agent,
                ];
            });
        },
    });
}
