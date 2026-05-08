/**
 * Nansen smart-money signal client. Reads from the local nansen-watcher cache
 * (default http://localhost:7755). Falls back to neutral if unreachable so the
 * trader can still produce a decision.
 */

export interface NansenSignal {
    yesCount: number;
    noCount: number;
    lastUpdated: number;
    neutral: boolean;
}

const BASE = process.env.NANSEN_WATCHER_URL ?? "http://localhost:7755";

export async function getSignal(token: string): Promise<NansenSignal> {
    try {
        const res = await fetch(`${BASE}/signal?token=${encodeURIComponent(token)}`, {
            signal: AbortSignal.timeout(1500),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Partial<NansenSignal>;
        return {
            yesCount: Number(data.yesCount ?? 0),
            noCount: Number(data.noCount ?? 0),
            lastUpdated: Number(data.lastUpdated ?? 0),
            neutral: Boolean(data.neutral ?? false),
        };
    } catch {
        return {yesCount: 0, noCount: 0, lastUpdated: 0, neutral: true};
    }
}
