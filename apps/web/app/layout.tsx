import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "OmenVault",
    description: "Prediction markets on Mantle. Capital earns yield while bets are open.",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
    return (
        <html lang="en">
            <body className="font-sans antialiased">{children}</body>
        </html>
    );
}
