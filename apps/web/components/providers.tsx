"use client";

/**
 * Client-side providers — wraps the app in WagmiProvider + QueryClientProvider.
 * Mounted from app/layout.tsx. Keeps server components free of wagmi.
 */

import {WagmiProvider} from "wagmi";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useState, type ReactNode} from "react";
import {wagmiConfig} from "@/lib/web3/wagmi";

export function Providers({children}: {children: ReactNode}) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Markets, prices, and the audit feed all update at chain pace; 10s polling
                        // is plenty for the demo. The live rail components add their own refetch.
                        refetchOnWindowFocus: false,
                        staleTime: 10_000,
                    },
                },
            }),
    );
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    );
}
