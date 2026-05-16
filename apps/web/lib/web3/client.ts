/**
 * A singleton viem `publicClient` for ad-hoc reads outside React (helpers, server actions).
 * Inside components, prefer the wagmi hooks — they integrate with react-query caching.
 */

import {createPublicClient, http, fallback} from "viem";
import {activeChain, rpcUrl} from "./config";

// Mirror the wagmi config: rotate through multiple public RPCs so a single
// rate-limited or down endpoint doesn't stall every read on the page.
const MANTLE_SEPOLIA_RPCS = [
    rpcUrl,
    "https://rpc.sepolia.mantle.xyz",
    "https://mantle-sepolia.drpc.org",
    "https://endpoints.omniatech.io/v1/mantle/sepolia/public",
];

const transport =
    activeChain.id === 5003
        ? fallback(
              Array.from(new Set(MANTLE_SEPOLIA_RPCS)).map((u) =>
                  http(u, {timeout: 8_000, retryCount: 1}),
              ),
              {rank: false},
          )
        : http(rpcUrl);

export const publicClient = createPublicClient({
    chain: activeChain,
    transport,
});
