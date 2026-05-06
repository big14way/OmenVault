/**
 * Nansen watcher — polls Nansen for smart-money labels and netflow on tokens
 * referenced by active markets. Caches results. Serves a local HTTP endpoint
 * the trader bot reads from.
 *
 * Endpoints:
 *   GET /signal?token=<address>  → { yesCount, noCount, lastUpdated }
 *
 * Graceful degrade: if NANSEN_API_KEY is unset, returns neutral { yesCount: 0, noCount: 0 }.
 */

import "dotenv/config";
import http from "node:http";

const PORT = Number(process.env.NANSEN_WATCHER_PORT ?? 7755);

const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    if (url.pathname === "/signal") {
        const token = url.searchParams.get("token") ?? "";
        // TODO(team): pull from cache populated by the poll loop.
        const payload = {token, yesCount: 0, noCount: 0, lastUpdated: 0, neutral: true};
        res.writeHead(200, {"content-type": "application/json"});
        res.end(JSON.stringify(payload));
        return;
    }
    res.writeHead(404);
    res.end();
});

async function main() {
    console.log(`[nansen-watcher] listening on http://localhost:${PORT}`);
    server.listen(PORT);
    console.log("[nansen-watcher] TODO(team): start poll loop against Nansen API per docs/ARCHITECTURE.md §5.3");
    // TODO(team):
    //   - Load NANSEN_API_KEY, list of tokens to watch (from MarketFactory.allMarkets, then per market.token)
    //   - setInterval poll → POST /api/v1/wallet/labels and /api/v1/smart-money/netflow
    //   - update an in-memory cache served via /signal
}

main().catch((err) => {
    console.error("[nansen-watcher] fatal:", err);
    process.exit(1);
});
