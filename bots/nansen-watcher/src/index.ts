/**
 * Nansen watcher — polls Nansen for smart-money labels and netflow on tokens
 * referenced by active markets. Caches results. Serves a local HTTP endpoint
 * the trader bot reads from.
 *
 * Endpoints:
 *   GET /signal?token=<address>  → { token, yesCount, noCount, lastUpdated, neutral, source }
 *   GET /health                  → { ok, mode, watchedTokens, lastPoll }
 *
 * Modes:
 *   - real: NANSEN_API_KEY set. The loop calls Nansen's /smart-money endpoints
 *     for each watched token and caches yes/no counts derived from netflow sign.
 *   - demo: no NANSEN_API_KEY. The loop generates a deterministic but moving
 *     signal from the token address + the current 10-minute window so the
 *     trader sees real numbers cycling without hitting a paid endpoint.
 */

import "dotenv/config";
import http from "node:http";

const PORT = Number(process.env.NANSEN_WATCHER_PORT ?? 7755);
const POLL_INTERVAL_SEC = Number(process.env.NANSEN_POLL_INTERVAL_SEC ?? 60);
const API_KEY = process.env.NANSEN_API_KEY ?? "";
const API_BASE = process.env.NANSEN_API_BASE ?? "https://api.nansen.ai/v1";

// Comma-separated list of token addresses to watch. The trader bot also calls
// /signal?token=<addr> on demand, but pre-watching the configured set keeps
// the cache warm.
const WATCH_TOKENS = (process.env.NANSEN_WATCH_TOKENS ?? process.env.NEXT_PUBLIC_USDT0_ADDRESS ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

const MODE: "real" | "demo" = API_KEY ? "real" : "demo";

interface Signal {
    token: string;
    yesCount: number;
    noCount: number;
    lastUpdated: number;
    neutral: boolean;
    source: "nansen" | "demo" | "cold";
}

const cache = new Map<string, Signal>();
let lastPoll = 0;

async function fetchNansenSignal(token: string): Promise<Signal> {
    // Use the Smart Money netflow endpoint. Netflow > 0 → wallets buying;
    // netflow < 0 → wallets selling. Map to the trader's yes/no count shape.
    const url = `${API_BASE.replace(/\/$/, "")}/smart-money/netflow?token=${token}`;
    const res = await fetch(url, {
        headers: {"api-key": API_KEY, accept: "application/json"},
        signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`nansen HTTP ${res.status}`);
    const data = (await res.json()) as {netflowUsd?: number; walletCount?: number};
    const netflow = data.netflowUsd ?? 0;
    const wallets = data.walletCount ?? 0;
    return {
        token,
        yesCount: netflow > 0 ? wallets : 0,
        noCount: netflow < 0 ? wallets : 0,
        lastUpdated: Math.floor(Date.now() / 1000),
        neutral: netflow === 0,
        source: "nansen",
    };
}

function demoSignal(token: string): Signal {
    // Deterministic-by-address but moves over time. Hash the address, mix in
    // the current 10-minute window so it cycles slowly. Yields integer counts
    // in [0, 7] for each side, which reads like real smart-money wallet counts.
    let addrSeed = 0;
    for (let i = 2; i < token.length; i += 4) {
        addrSeed = (addrSeed * 31 + parseInt(token.slice(i, i + 4) || "0", 16)) >>> 0;
    }
    const window = Math.floor(Date.now() / 1000 / 600);
    const mix = (addrSeed ^ window) >>> 0;
    const total = 3 + (mix % 5);
    const yesShare = (mix >> 4) % (total + 1);
    return {
        token,
        yesCount: yesShare,
        noCount: total - yesShare,
        lastUpdated: Math.floor(Date.now() / 1000),
        neutral: yesShare === total - yesShare,
        source: "demo",
    };
}

async function refreshToken(token: string) {
    try {
        const sig = MODE === "real" ? await fetchNansenSignal(token) : demoSignal(token);
        cache.set(token, sig);
    } catch (err) {
        console.error(`[nansen-watcher] refresh failed for ${token}:`, (err as Error).message);
    }
}

async function pollAll() {
    lastPoll = Math.floor(Date.now() / 1000);
    await Promise.allSettled(WATCH_TOKENS.map(refreshToken));
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (url.pathname === "/health") {
        res.writeHead(200, {"content-type": "application/json"});
        res.end(JSON.stringify({ok: true, mode: MODE, watchedTokens: WATCH_TOKENS, lastPoll}));
        return;
    }

    if (url.pathname === "/signal") {
        const tokenRaw = (url.searchParams.get("token") ?? "").toLowerCase();
        if (!tokenRaw) {
            res.writeHead(400, {"content-type": "application/json"});
            res.end(JSON.stringify({error: "missing ?token=<address>"}));
            return;
        }
        if (!cache.has(tokenRaw)) await refreshToken(tokenRaw);
        const payload: Signal = cache.get(tokenRaw) ?? {
            token: tokenRaw,
            yesCount: 0,
            noCount: 0,
            lastUpdated: 0,
            neutral: true,
            source: "cold",
        };
        res.writeHead(200, {"content-type": "application/json"});
        res.end(JSON.stringify(payload));
        return;
    }

    res.writeHead(404, {"content-type": "application/json"});
    res.end(JSON.stringify({error: "not found"}));
});

async function main() {
    server.listen(PORT);
    console.log(
        `[nansen-watcher] listening on http://localhost:${PORT} ` +
            `mode=${MODE} watching=[${WATCH_TOKENS.join(", ") || "<none>"}]`,
    );
    if (MODE === "demo") {
        console.log("[nansen-watcher] no NANSEN_API_KEY set — serving deterministic demo signals.");
    }
    if (WATCH_TOKENS.length > 0) {
        await pollAll();
        setInterval(() => {
            pollAll().catch((err) => console.error("[nansen-watcher] poll error:", err));
        }, POLL_INTERVAL_SEC * 1000);
    }
}

main().catch((err) => {
    console.error("[nansen-watcher] fatal:", err);
    process.exit(1);
});
