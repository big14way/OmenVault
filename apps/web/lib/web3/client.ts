/**
 * A singleton viem `publicClient` for ad-hoc reads outside React (helpers, server actions).
 * Inside components, prefer the wagmi hooks — they integrate with react-query caching.
 */

import {createPublicClient, http} from "viem";
import {activeChain, rpcUrl} from "./config";

export const publicClient = createPublicClient({
    chain: activeChain,
    transport: http(rpcUrl),
});
