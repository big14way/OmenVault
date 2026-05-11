/**
 * wagmi config — used by the React provider in components/providers.tsx.
 * Keep this file lean; ABI/address constants live in ./config.ts and ./abis/.
 */

import {http, createConfig} from "wagmi";
import {injected} from "wagmi/connectors";
import {mantleSepoliaTestnet} from "viem/chains";
import {activeChain, anvilChain, rpcUrl} from "./config";

// Both chains live in the chains tuple so the Record<id, Transport> infers a union
// covering both; `activeChain` uses the env-configured RPC, the other gets default http.
const isMantle = activeChain.id === 5003;
export const wagmiConfig = createConfig({
    chains: [anvilChain, mantleSepoliaTestnet],
    connectors: [injected()],
    transports: {
        31337: isMantle ? http() : http(rpcUrl),
        5003: isMantle ? http(rpcUrl) : http(),
    },
    ssr: true,
});

declare module "wagmi" {
    interface Register {
        config: typeof wagmiConfig;
    }
}
