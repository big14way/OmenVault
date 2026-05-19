/**
 * Nansen watcher — local HTTP service the trader bot reads from to fold
 * smart-money sentiment into its sizing decision.
 *
 * Endpoints:
 *   GET /signal?token=<address>  → { token, yesCount, noCount, lastUpdated, neutral, source }
 *   GET /health                  → { ok, mode, callsUsed, lastRefresh, cacheSize }
 *
 * Modes:
 *   - real: NANSEN_API_KEY set. Calls POST /api/v1/token-screener once per
 *     NANSEN_CACHE_TTL_HOURS (default 24h) and caches the top smart-money
 *     tokens. Per-token /signal lookups serve from cache; tokens not in the
 *     Nansen result fall back to an aggregate sentiment derived from the top
 *     of the screener (so a demo market on a Mantle token still gets a
 *     plausible smart-money skew).
 *   - demo: no NANSEN_API_KEY. Deterministic-by-address moving signal so
 *     the trader sees real-looking numbers without burning paid quota.
 *
 * Endpoint shape and headers match Nansen's public docs (POST JSON body,
 * `apiKey:` header). The trader's free tier is 10 calls total — this watcher
 * uses at most one per cache refresh window.
 */

import "dotenv/config";
import http from "node:http";

const PORT = Number(process.env.NANSEN_WATCHER_PORT ?? 7755);
const API_KEY = process.env.NANSEN_API_KEY ?? "";
const API_BASE = (process.env.NANSEN_BASE_URL ?? process.env.NANSEN_API_BASE ?? "https://api.nansen.ai").replace(/\/$/, "");
const CACHE_TTL_HOURS = Number(process.env.NANSEN_CACHE_TTL_HOURS ?? 24);
const MIN_REFRESH_MS = Math.max(1, CACHE_TTL_HOURS) * 3600 * 1000;
const SCREENER_CHAINS = (process.env.NANSEN_CHAINS ?? "ethereum,solana,base")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
const SCREENER_PAGE_SIZE = Number(process.env.NANSEN_PAGE_SIZE ?? 100);

const MODE: "real" | "demo" = API_KEY ? "real" : "demo";

interface Signal {
    token: string;
    yesCount: number;
    noCount: number;
    lastUpdated: number;
    neutral: boolean;
    source: "nansen" | "nansen-aggregate" | "demo" | "cold";
}

const cache = new Map<string, Signal>();
let lastRefreshMs = 0;
let callsUsed = 0;
let aggregateSignal: Signal | null = null;

/**
 * Best-effort extractor: Nansen response shapes vary across products. Try the
 * fields that have appeared in their public examples; coerce anything numeric.
 */
function readNumber(row: Record<string, unknown>, keys: string[]): number {
    for (const k of keys) {
        const v = row[k];
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
    }
    return 0;
}

function readString(row: Record<string, unknown>, keys: string[]): string {
    for (const k of keys) {
        const v = row[k];
        if (typeof v === "string" && v.length > 0) return v;
    }
    return "";
}

async function refreshCacheIfStale(force = false): Promise<void> {
    if (MODE !== "real") return;
    if (!force && Date.now() - lastRefreshMs < MIN_REFRESH_MS) return;
    const body = {
        chains: SCREENER_CHAINS,
        timeframe: "24h",
        filters: {only_smart_money: true, token_age_days: {min: 1, max: 365}},
        order_by: [{field: "buy_volume", direction: "DESC"}],
        pagination: {page: 1, per_page: SCREENER_PAGE_SIZE},
    };
    const url = `${API_BASE}/api/v1/token-screener`;
    callsUsed += 1;
    const res = await fetch(url, {
        method: "POST",
        headers: {apiKey: API_KEY, "content-type": "application/json"},
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`nansen HTTP ${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as Record<string, unknown>;
    // Response is paginated; rows live under `data`, `tokens`, or `results`.
    const rows = ((data.data ?? data.tokens ?? data.results ?? []) as Record<string, unknown>[]) || [];

    cache.clear();
    let aggBuyers = 0;
    let aggSellers = 0;
    const now = Math.floor(Date.now() / 1000);
    for (const row of rows) {
        const token = readString(row, ["token_address", "address", "contract_address"]).toLowerCase();
        if (!token) continue;
        const buyers = readNumber(row, ["smart_money_buyers", "smart_money_buy_count", "buyer_count", "n_buyers"]);
        const sellers = readNumber(row, ["smart_money_sellers", "smart_money_sell_count", "seller_count", "n_sellers"]);
        // Fall back to inferring from buy_volume vs sell_volume sign if explicit
        // buyer/seller counts aren't in the response shape.
        let yesCount = buyers;
        let noCount = sellers;
        if (yesCount === 0 && noCount === 0) {
            const buyVol = readNumber(row, ["buy_volume", "buy_volume_usd"]);
            const sellVol = readNumber(row, ["sell_volume", "sell_volume_usd"]);
            if (buyVol > sellVol) yesCount = 1;
            else if (sellVol > buyVol) noCount = 1;
        }
        aggBuyers += yesCount;
        aggSellers += noCount;
        cache.set(token, {
            token,
            yesCount,
            noCount,
            lastUpdated: now,
            neutral: yesCount === noCount,
            source: "nansen",
        });
    }
    aggregateSignal = {
        token: "<aggregate>",
        yesCount: aggBuyers,
        noCount: aggSellers,
        lastUpdated: now,
        neutral: aggBuyers === aggSellers,
        source: "nansen-aggregate",
    };
    lastRefreshMs = Date.now();
    console.log(
        `[nansen-watcher] refreshed: tokens=${cache.size} aggregate yes=${aggBuyers} no=${aggSellers} ` +
            `calls_used=${callsUsed}`,
    );
}

function demoSignal(token: string): Signal {
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

function resolveSignal(tokenRaw: string): Signal {
    const token = tokenRaw.toLowerCase();
    if (MODE === "demo") return demoSignal(token);
    // Real mode: prefer exact token match, then aggregate, then cold/demo.
    const exact = cache.get(token);
    if (exact) return exact;
    if (aggregateSignal && (aggregateSignal.yesCount > 0 || aggregateSignal.noCount > 0)) {
        // Re-tag aggregate signal with the requested token so the trader's logs
        // still reference what it asked about.
        return {...aggregateSignal, token};
    }
    return {
        token,
        yesCount: 0,
        noCount: 0,
        lastUpdated: 0,
        neutral: true,
        source: "cold",
    };
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

    if (url.pathname === "/health") {
        res.writeHead(200, {"content-type": "application/json"});
        res.end(
            JSON.stringify({
                ok: true,
                mode: MODE,
                callsUsed,
                lastRefresh: lastRefreshMs ? Math.floor(lastRefreshMs / 1000) : 0,
                cacheSize: cache.size,
                cacheTtlHours: CACHE_TTL_HOURS,
            }),
        );
        return;
    }

    if (url.pathname === "/signal") {
        const tokenRaw = (url.searchParams.get("token") ?? "").toLowerCase();
        if (!tokenRaw) {
            res.writeHead(400, {"content-type": "application/json"});
            res.end(JSON.stringify({error: "missing ?token=<address>"}));
            return;
        }
        // Lazy refresh if cache is stale. Suppresses errors so the trader doesn't
        // see 500s when Nansen is rate-limited; falls back to cold/demo signal.
        try {
            await refreshCacheIfStale();
        } catch (err) {
            console.error("[nansen-watcher] lazy refresh failed:", (err as Error).message);
        }
        res.writeHead(200, {"content-type": "application/json"});
        res.end(JSON.stringify(resolveSignal(tokenRaw)));
        return;
    }

    res.writeHead(404, {"content-type": "application/json"});
    res.end(JSON.stringify({error: "not found"}));
});

async function main() {
    server.listen(PORT);
    console.log(
        `[nansen-watcher] listening on http://localhost:${PORT} mode=${MODE} ` +
            `ttl=${CACHE_TTL_HOURS}h chains=[${SCREENER_CHAINS.join(",")}]`,
    );
    if (MODE === "demo") {
        console.log("[nansen-watcher] NANSEN_API_KEY unset — serving deterministic demo signals only.");
        return;
    }
    // One refresh on startup (counts as 1 of 10 free calls). Subsequent refreshes
    // are lazy and gated by MIN_REFRESH_MS.
    try {
        await refreshCacheIfStale(true);
    } catch (err) {
        console.error("[nansen-watcher] initial refresh failed:", (err as Error).message);
    }
}

main().catch((err) => {
    console.error("[nansen-watcher] fatal:", err);
    process.exit(1);
});
