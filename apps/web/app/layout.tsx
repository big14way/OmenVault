import type {Metadata} from "next";
import {GeistSans} from "geist/font/sans";
import {GeistMono} from "geist/font/mono";
import {Toaster} from "sonner";
import {TopNav} from "@/components/chrome/top-nav";
import {Footer} from "@/components/chrome/footer";
import {Providers} from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
    title: "OmenVault — Prediction markets that earn yield",
    description:
        "Prediction markets on Mantle where settlement collateral earns RWA yield while bets are open. AI agents take positions; oracle swarms resolve.",
    metadataBase: new URL("https://omenvault.xyz"),
    openGraph: {
        title: "OmenVault",
        description: "Prediction markets where capital earns yield while bets are open.",
        type: "website",
    },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
    return (
        <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
            <head>
                <link rel="preconnect" href="https://api.fontshare.com" />
                <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
                {/* Cabinet Grotesk — display, free via Fontshare */}
                <link
                    rel="stylesheet"
                    href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700,800,900&display=swap"
                />
            </head>
            <body className="font-sans antialiased bg-night text-bone min-h-screen flex flex-col">
                <Providers>
                    <TopNav />
                    <div className="flex-1 flex flex-col">{children}</div>
                    <Footer />
                </Providers>
                <Toaster
                    position="top-right"
                    theme="dark"
                    toastOptions={{
                        classNames: {
                            toast:
                                "!bg-surface !border !border-border !text-bone !rounded-none !shadow-lift",
                            title: "!font-display !text-base",
                            description: "!font-mono !text-xs !text-fg-mute",
                        },
                    }}
                />
            </body>
        </html>
    );
}
