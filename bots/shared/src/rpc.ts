import {
    FallbackProvider,
    FetchRequest,
    JsonRpcProvider,
    Network,
    Wallet,
    type AbstractProvider,
} from "ethers";
import {requireEnv, optionalEnv} from "./env.js";

// Public Mantle Sepolia RPCs the bots fall through to if the primary is down.
// Ordering reflects observed reliability — drpc tends to outlast the others.
const PUBLIC_RPCS = [
    "https://mantle-sepolia.drpc.org",
    "https://rpc.sepolia.mantle.xyz",
];

const MANTLE_SEPOLIA = Network.from(5003);

/**
 * ethers v6's bundled `getUrl` (node:https) intermittently times out on
 * Mantle Sepolia public RPCs in some Node setups, while Node's global `fetch`
 * (undici) reaches the same endpoints fine. Registering a fetch-backed
 * transport once at module load makes every ethers RPC call go through fetch.
 */
let fetchTransportInstalled = false;
function installFetchTransport() {
    if (fetchTransportInstalled) return;
    fetchTransportInstalled = true;
    FetchRequest.registerGetUrl(async (req) => {
        const controller = new AbortController();
        const timeoutMs = req.timeout > 0 ? req.timeout : 30_000;
        const t = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(req.url, {
                method: req.method,
                headers: req.headers,
                body: req.body ? Buffer.from(req.body) : undefined,
                signal: controller.signal,
            });
            const body = new Uint8Array(await res.arrayBuffer());
            const headers: Record<string, string> = {};
            res.headers.forEach((v, k) => {
                headers[k.toLowerCase()] = v;
            });
            return {
                statusCode: res.status,
                statusMessage: res.statusText,
                headers,
                body,
            };
        } finally {
            clearTimeout(t);
        }
    });
}

function rpcUrls(): string[] {
    return Array.from(
        new Set(
            [process.env.MANTLE_SEPOLIA_RPC_URL, process.env.RPC_URL, ...PUBLIC_RPCS].filter(
                (u): u is string => Boolean(u),
            ),
        ),
    );
}

/**
 * Build a single JsonRpcProvider against one URL, with the network pinned so
 * ethers doesn't burn a startup eth_chainId round-trip.
 */
function singleProvider(url: string): JsonRpcProvider {
    return new JsonRpcProvider(url, MANTLE_SEPOLIA, {staticNetwork: MANTLE_SEPOLIA});
}

/**
 * Resilient Mantle Sepolia provider:
 *   - Installs the fetch transport on first call.
 *   - If only one URL is configured, returns a plain JsonRpcProvider.
 *   - Otherwise returns a FallbackProvider with quorum=1 so a single working
 *     RPC unblocks reads. Writes (sendTransaction) broadcast in parallel —
 *     duplicate-tx errors from the second RPC are expected and harmless.
 *
 * MANTLE_SEPOLIA_RPC_URL remains required so the existing env contract holds
 * (smoke / deploy scripts that read it directly still work).
 */
export function provider(): AbstractProvider {
    installFetchTransport();
    // Keep the requireEnv guard for env-completeness signaling.
    requireEnv("MANTLE_SEPOLIA_RPC_URL");
    const urls = rpcUrls();
    if (urls.length === 1) return singleProvider(urls[0]);
    return new FallbackProvider(
        urls.map((u, i) => ({
            provider: singleProvider(u),
            priority: i + 1,
            weight: 1,
            stallTimeout: 2_000,
        })),
        MANTLE_SEPOLIA,
        {quorum: 1},
    );
}

export function signer(envKey = "PRIVATE_KEY"): Wallet {
    const pk = optionalEnv(envKey);
    if (!pk) throw new Error(`Missing private key env var: ${envKey}`);
    return new Wallet(pk, provider());
}
