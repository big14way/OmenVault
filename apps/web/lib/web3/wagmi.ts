/**
 * wagmi config — used by the React provider in components/providers.tsx.
 * Keep this file lean; ABI/address constants live in ./config.ts and ./abis/.
 */

import {http, createConfig, fallback} from "wagmi";
import {injected, walletConnect, coinbaseWallet} from "wagmi/connectors";
import {mantleSepoliaTestnet} from "viem/chains";
import {activeChain, anvilChain, rpcUrl} from "./config";

// Public RPC endpoints are flaky / rate-limited individually. Fallback rotates
// through several so a single timeout doesn't kill the page.
const MANTLE_SEPOLIA_RPCS = [
    rpcUrl,
    "https://rpc.sepolia.mantle.xyz",
    "https://mantle-sepolia.drpc.org",
    "https://endpoints.omniatech.io/v1/mantle/sepolia/public",
];

const mantleTransport = fallback(
    Array.from(new Set(MANTLE_SEPOLIA_RPCS)).map((u) =>
        http(u, {timeout: 8_000, retryCount: 1})
    ),
    {rank: false},
);

const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() || "";

const connectors = [
    injected({shimDisconnect: true}),
    coinbaseWallet({appName: "OmenVault", appLogoUrl: "/icon.png"}),
    // Only register WalletConnect when a Project ID is configured — calling
    // the connector with an empty ID throws inside the WC client at runtime.
    ...(walletConnectProjectId
        ? [
              walletConnect({
                  projectId: walletConnectProjectId,
                  metadata: {
                      name: "OmenVault",
                      description:
                          "Prediction markets on Mantle where collateral earns RWA yield while bets are open.",
                      url: "https://omenvault.vercel.app",
                      icons: ["https://omenvault.vercel.app/icon.png"],
                  },
                  showQrModal: true,
              }),
          ]
        : []),
];

const isMantle = activeChain.id === 5003;
export const wagmiConfig = createConfig({
    chains: [anvilChain, mantleSepoliaTestnet],
    connectors,
    transports: {
        31337: isMantle ? http() : http(rpcUrl),
        5003: isMantle ? mantleTransport : http(),
    },
    ssr: true,
});

declare module "wagmi" {
    interface Register {
        config: typeof wagmiConfig;
    }
}
