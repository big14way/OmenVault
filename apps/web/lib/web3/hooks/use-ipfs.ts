"use client";

/**
 * useIpfsJson — fetch a JSON blob pinned at an IPFS cid via a public gateway,
 * cached via react-query. Used to surface trader/oracle reasoning blobs that
 * the bots emit on each DecisionLog write.
 *
 * The gateway is configurable via NEXT_PUBLIC_IPFS_GATEWAY; defaults to
 * https://gateway.pinata.cloud/ipfs/ (the same one bots pin to via PINATA_JWT).
 */

import {useQuery} from "@tanstack/react-query";

const GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";

export interface IpfsReasoning {
    /// Free-form reasoning string the bot wrote.
    reasoning?: string;
    /// Optional fields the trader/oracle blobs may include.
    side?: "YES" | "NO";
    outcome?: "YES" | "NO" | "INVALID";
    sizeUsdt0?: number;
    confidence?: number;
    alloraForecastE18?: string;
    smartMoneyYes?: number;
    smartMoneyNo?: number;
    [key: string]: unknown;
}

export function useIpfsJson<T = IpfsReasoning>(cid: string | undefined, enabled = true) {
    return useQuery({
        queryKey: ["ipfs", cid],
        enabled: enabled && Boolean(cid) && cid !== "",
        staleTime: 60 * 60 * 1000, // 1h — pinned blobs are immutable
        retry: 1,
        queryFn: async (): Promise<T | null> => {
            if (!cid) return null;
            // Trim any "ipfs://" prefix.
            const clean = cid.replace(/^ipfs:\/\//, "");
            const url = `${GATEWAY.replace(/\/$/, "")}/${clean}`;
            const res = await fetch(url, {signal: AbortSignal.timeout(10_000)});
            if (!res.ok) throw new Error(`IPFS gateway HTTP ${res.status}`);
            return (await res.json()) as T;
        },
    });
}
