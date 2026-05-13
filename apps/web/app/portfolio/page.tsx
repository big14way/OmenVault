"use client";

import Link from "next/link";
import {useMemo} from "react";
import {ArrowRight, Wallet} from "@phosphor-icons/react/dist/ssr";
import {toast} from "sonner";
import {useAccount, useConnect} from "wagmi";
import {Button} from "@/components/primitives/button";
import {useMarkets} from "@/lib/web3/hooks/use-markets";
import {usePortfolio, type PortfolioEntry} from "@/lib/web3/hooks/use-portfolio";
import {useClaim} from "@/lib/web3/hooks/use-claim";
import {formatUsdt0, timeUntil} from "@/lib/format";
import {cn} from "@/lib/cn";
import type {Address} from "viem";

export default function PortfolioPage() {
    const {address, isConnected} = useAccount();
    const {connect, connectors} = useConnect();
    const {data: markets} = useMarkets();
    const {data: entries, isLoading} = usePortfolio(markets);

    const connectWallet = () => {
        const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
        if (injected) connect({connector: injected});
        else toast("No wallet detected", {description: "Install MetaMask or another injected wallet."});
    };

    const totals = useMemo(() => {
        const list = entries ?? [];
        const staked = list.reduce((s, e) => s + e.position.stakedUsdt0, 0);
        const open = list.filter((e) => e.market.status === "active").length;
        const claimable = list.filter(
            (e) => e.market.status === "resolved" && !e.claimed && e.market.resolvedOutcome === e.position.side
        ).length;
        return {staked, open, claimable, count: list.length};
    }, [entries]);

    return (
        <main className="relative flex-1 flex flex-col pb-24">
            <section className="border-b border-border">
                <div className="max-w-[1440px] mx-auto w-full px-6 md:px-10 pt-6 pb-10">
                    <div className="mb-7 flex items-center gap-2 font-mono text-[11px] uppercase tracking-eyebrow text-fg-mute">
                        <Link href="/markets" className="hover:text-amber">Markets</Link>
                        <span className="text-fg-dim">/</span>
                        <span className="text-bone">portfolio</span>
                    </div>

                    <h1 className="font-display font-extrabold text-display-lg text-bone leading-[1.02] text-balance">
                        Your positions.
                    </h1>
                    <p className="mt-4 font-mono text-[13px] text-fg-mute tabular max-w-prose">
                        Every market where this wallet holds shares. Live on Mantle Sepolia.
                    </p>

                    {isConnected && (
                        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-px bg-border max-w-3xl">
                            <Stat label="Wallet" value={address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—"} mono />
                            <Stat label="Positions" value={totals.count.toString()} />
                            <Stat label="Open" value={totals.open.toString()} />
                            <Stat label="Claimable" value={totals.claimable.toString()} tone={totals.claimable > 0 ? "mint" : undefined} />
                        </div>
                    )}
                </div>
            </section>

            <section className="max-w-[1440px] mx-auto w-full px-6 md:px-10 pt-10 flex-1">
                {!isConnected ? (
                    <EmptyState
                        title="Connect a wallet to view your positions"
                        body="Your entries are read directly from the Market contracts — no off-chain index."
                        action={
                            <Button onClick={connectWallet} variant="primary" size="md">
                                <Wallet size={14} weight="regular" />
                                Connect Wallet
                            </Button>
                        }
                    />
                ) : isLoading ? (
                    <p className="font-mono text-[12px] text-fg-mute">Loading positions…</p>
                ) : !entries || entries.length === 0 ? (
                    <EmptyState
                        title="No positions yet"
                        body="Take a position on any active market to see it here."
                        action={
                            <Link href="/markets">
                                <Button variant="primary" size="md">
                                    Browse markets <ArrowRight size={13} weight="regular" />
                                </Button>
                            </Link>
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-px bg-border border border-border">
                        {entries.map((e) => (
                            <PositionRow key={e.market.address} entry={e} />
                        ))}
                    </div>
                )}

                <p className="mt-6 font-mono text-[10.5px] text-fg-faint tabular">
                    Auto-refreshing every 10s · USDT0 has 6 decimals
                </p>
            </section>
        </main>
    );
}

function PositionRow({entry}: {entry: PortfolioEntry}) {
    const {market, position, claimed} = entry;
    const currentPrice = position.side === "YES" ? market.yesPrice : market.noPrice;
    const markValue = position.shares * currentPrice;
    const pnl = markValue - position.stakedUsdt0;
    const pnlPct = position.stakedUsdt0 > 0 ? pnl / position.stakedUsdt0 : 0;

    const claimMutation = useClaim();
    const isWinner =
        market.status === "resolved" && market.resolvedOutcome === position.side && !claimed;

    const onClaim = async () => {
        try {
            toast.loading("Submitting claim…", {id: `claim-${market.address}`});
            await claimMutation.mutateAsync(market.address as Address);
            toast.success("Claim sent", {id: `claim-${market.address}`});
        } catch (err: any) {
            toast.error("Claim failed", {
                id: `claim-${market.address}`,
                description: err?.shortMessage ?? err?.message?.slice(0, 80) ?? "unknown error",
            });
        }
    };

    return (
        <div className="bg-night px-5 py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center hover:bg-surface transition-colors">
            <div className="md:col-span-5 min-w-0">
                <Link
                    href={`/markets/${market.address}`}
                    className="font-display font-bold text-base text-bone hover:text-amber transition-colors line-clamp-2 underline-draw"
                >
                    {market.question}
                </Link>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute tabular">
                    {market.tier} · {market.status} · {market.status === "active" ? timeUntil(market.resolutionAt) : market.status === "resolved" ? `outcome ${market.resolvedOutcome ?? "—"}` : "awaiting oracle"}
                </p>
            </div>

            <div className="md:col-span-2">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">Side</p>
                <p
                    className={cn(
                        "font-display font-bold text-xl",
                        position.side === "YES" ? "text-mint" : "text-coral"
                    )}
                >
                    {position.side}
                </p>
                <p className="font-mono text-[10px] text-fg-faint tabular">
                    {position.shares.toFixed(0)} shares
                </p>
            </div>

            <div className="md:col-span-2">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">Staked</p>
                <p className="font-display font-bold text-xl text-bone tabular">
                    {formatUsdt0(position.stakedUsdt0)}
                </p>
                <p className="font-mono text-[10px] text-fg-faint tabular">
                    @ {position.enteredPrice.toFixed(2)}
                </p>
            </div>

            <div className="md:col-span-2">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">P&L</p>
                <p
                    className={cn(
                        "font-display font-bold text-xl tabular",
                        pnl >= 0 ? "text-mint" : "text-coral"
                    )}
                >
                    {pnl >= 0 ? "+" : ""}{formatUsdt0(pnl)}
                </p>
                <p className={cn(
                    "font-mono text-[10px] tabular",
                    pnl >= 0 ? "text-mint" : "text-coral"
                )}>
                    {pnl >= 0 ? "+" : ""}{(pnlPct * 100).toFixed(1)}%
                </p>
            </div>

            <div className="md:col-span-1 flex md:justify-end">
                {isWinner ? (
                    <Button
                        size="sm"
                        variant="primary"
                        onClick={onClaim}
                        disabled={claimMutation.isPending}
                    >
                        {claimMutation.isPending ? "…" : "Claim"}
                    </Button>
                ) : claimed ? (
                    <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-faint">claimed</span>
                ) : (
                    <Link
                        href={`/markets/${market.address}`}
                        className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute hover:text-amber"
                    >
                        Open →
                    </Link>
                )}
            </div>
        </div>
    );
}

function Stat({label, value, mono, tone}: {label: string; value: string; mono?: boolean; tone?: "mint"}) {
    return (
        <div className="bg-night p-4">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">{label}</p>
            <p
                className={cn(
                    "mt-1.5 font-display font-bold text-xl tabular leading-none",
                    mono && "font-mono text-base",
                    tone === "mint" ? "text-mint" : "text-bone"
                )}
            >
                {value}
            </p>
        </div>
    );
}

function EmptyState({title, body, action}: {title: string; body: string; action?: React.ReactNode}) {
    return (
        <div className="border border-border bg-surface px-8 py-16 flex flex-col items-center text-center max-w-2xl mx-auto">
            <h2 className="font-display font-bold text-2xl text-bone">{title}</h2>
            <p className="mt-3 font-mono text-[12px] text-fg-mute max-w-md leading-relaxed">{body}</p>
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
