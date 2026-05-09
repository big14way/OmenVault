import Link from "next/link";
import {ArrowUpRight} from "@phosphor-icons/react/dist/ssr";
import {Wordmark} from "@/components/primitives/wordmark";

const NAV_LINKS = [
    {label: "Markets", href: "/markets"},
    {label: "Agents", href: "/agents/registry"},
    {label: "Audit", href: "/audit"},
];

const RESOURCE_LINKS = [
    {label: "GitHub", href: "https://github.com/big14way/omenvault", external: true},
    {label: "Architecture", href: "/docs/architecture"},
    {label: "ERC-8004 spec", href: "https://eips.ethereum.org/EIPS/eip-8004", external: true},
];

const SPEC: {label: string; value: string; mono?: boolean}[] = [
    {label: "Network", value: "Mantle Sepolia"},
    {label: "Settlement", value: "USDT0", mono: true},
    {label: "Yield tiers", value: "USDY · sUSDe", mono: true},
    {label: "Resolution", value: "3-of-3 oracle swarm"},
    {label: "Identity", value: "ERC-8004 soulbound"},
    {label: "License", value: "MIT", mono: true},
];

export function Footer() {
    return (
        <footer className="relative mt-32 border-t border-border bg-night">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
                    {/* Left — wordmark + links, sat tight to the top */}
                    <div className="lg:col-span-6 flex flex-col gap-8">
                        <Wordmark />

                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-x-5 gap-y-2">
                                {NAV_LINKS.map((link) => (
                                    <Link
                                        key={link.label}
                                        href={link.href}
                                        className="text-[13px] text-bone hover:text-amber transition-colors underline-draw"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-x-5 gap-y-2">
                                {RESOURCE_LINKS.map((link) =>
                                    link.external ? (
                                        <a
                                            key={link.label}
                                            href={link.href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-[13px] text-bone-soft hover:text-amber transition-colors underline-draw"
                                        >
                                            {link.label}
                                            <ArrowUpRight
                                                size={11}
                                                weight="regular"
                                                className="opacity-50"
                                            />
                                        </a>
                                    ) : (
                                        <Link
                                            key={link.label}
                                            href={link.href}
                                            className="text-[13px] text-bone-soft hover:text-amber transition-colors underline-draw"
                                        >
                                            {link.label}
                                        </Link>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right — spec sheet */}
                    <div className="lg:col-span-6">
                        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute mb-4">
                            Spec
                        </p>
                        <dl className="divide-y divide-border-soft">
                            {SPEC.map((row) => (
                                <div
                                    key={row.label}
                                    className="flex items-baseline justify-between py-2.5 gap-6"
                                >
                                    <dt className="font-mono text-[11px] uppercase tracking-eyebrow text-fg-mute shrink-0">
                                        {row.label}
                                    </dt>
                                    <dd
                                        className={
                                            row.mono
                                                ? "font-mono text-[12px] text-bone tabular text-right"
                                                : "text-[13px] text-bone text-right"
                                        }
                                    >
                                        {row.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>

                <div className="mt-14 pt-6 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-faint tabular">
                        v0.1.0 · Pre-audit · Testnet only · Not financial advice
                    </p>
                    <a
                        href="https://sepolia.mantlescan.xyz"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute hover:text-amber transition-colors"
                    >
                        View on Mantlescan
                        <ArrowUpRight size={11} weight="regular" />
                    </a>
                </div>
            </div>
        </footer>
    );
}
