"use client";

/**
 * useNansenSignal — fetch the latest smart-money signal for a token from the
 * local nansen-watcher service. Falls back to null on network errors so the UI
 * can decide what to render (the watcher is dev-only by default).
 *
 * Endpoint shape (defined in bots/nansen-watcher/src/index.ts):
 *   GET /signal?token=<address>
 *   → { token, yesCount, noCount, lastUpdated, neutral, source }
 *
 * Override the base URL via NEXT_PUBLIC_NANSEN_WATCHER_URL when the watcher
 * isn't on the default localhost:7755.
 */

import {useQuery} from "@tanstack/react-query";

const BASE = (process.env.NEXT_PUBLIC_NANSEN_WATCHER_URL ?? "http://localhost:7755").replace(/\/$/, "");

export interface NansenSignal {
    token: string;
    yesCount: number;
    noCount: number;
    lastUpdated: number;
    neutral: boolean;
    source: string;
}

export function useNansenSignal(token: string | undefined) {
    return useQuery({
        queryKey: ["nansen-signal", token],
        enabled: Boolean(token),
        refetchInterval: 15_000,
        retry: 0,
        staleTime: 10_000,
        queryFn: async (): Promise<NansenSignal | null> => {
            if (!token) return null;
            try {
                const res = await fetch(`${BASE}/signal?token=${token}`, {
                    signal: AbortSignal.timeout(4_000),
                });
                if (!res.ok) return null;
                return (await res.json()) as NansenSignal;
            } catch {
                return null;
            }
        },
    });
}
