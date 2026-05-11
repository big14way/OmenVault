"use client";

import Link from "next/link";
import {notFound, useParams} from "next/navigation";
import {useState} from "react";
import {motion} from "framer-motion";
import {ArrowLeft, ChartLine, Flag, Lightning} from "@phosphor-icons/react/dist/ssr";
import {Badge, LiveDot} from "@/components/primitives/badge";
import {OutcomeBar} from "@/components/markets/outcome-bar";
import {YieldBar} from "@/components/markets/yield-bar";
import {ActivityFeed} from "@/components/markets/activity-feed";
import {OracleSwarmPanel} from "@/components/markets/oracle-swarm-panel";
import {PositionForm} from "@/components/markets/position-form";
import {
    decisionsForMarket,
    findMarket,
    MOCK_ORACLE_VOTES,
    MOCK_POSITIONS,
} from "@/lib/mock-data";
import {TIER_APY} from "@/lib/types";
import {useMarket} from "@/lib/web3/hooks/use-market";
import {usePosition} from "@/lib/web3/hooks/use-position";
import {
    formatDateLong,
    formatPercent,
    formatUsdt0,
    shortAddress,
    timeUntil,
} from "@/lib/format";
import {cn} from "@/lib/cn";

export default function MarketDetailPage() {
    const params = useParams<{id: string}>();
    const id = params.id;
    // Try on-chain first; fall back to mocks for the seeded design-time IDs.
    const {data: onChainMarket} = useMarket(id);
    const market = onChainMarket ?? findMarket(id);
    const {data: onChainPosition} = usePosition(id);

    const [tab, setTab] = useState<"activity" | "stats" | "allora" | "nansen">("activity");

    if (!market) {
        notFound();
    }

    const decisions = decisionsForMarket(market.id);
    const oracleVotes = MOCK_ORACLE_VOTES[market.id] ?? [];
    const myPosition =
        onChainPosition ?? MOCK_POSITIONS.find((p) => p.marketId === market.id);
    const apy = TIER_APY[market.tier];

    return (
        <main className="relative pb-32">
            {/* Breadcrumb + back */}
            <div className="border-b border-paper-line">
                <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-4 flex items-center gap-3 text-[11px] font-mono uppercase tracking-eyebrow">
                    <Link
                        href="/markets"
                        className="inline-flex items-center gap-1.5 text-ink-mute hover:text-ink"
                    >
                        <ArrowLeft size={11} weight="regular" />
                        Markets
                    </Link>
                    <span className="text-paper-edge">/</span>
                    <span className="text-ink">Mkt #{market.id}</span>
                    <span className="text-paper-edge">·</span>
                    <span className="text-ink-mute">{market.tier} tier</span>
                    {market.status === "active" && (
                        <span className="text-ink-mute">
                            · resolves {formatDateLong(market.resolutionAt)}
                        </span>
                    )}
                </div>
            </div>

            {/* Header */}
            <section className="border-b border-paper-line">
                <div className="max-w-[1440px] mx-auto px-6 md:px-10 pt-10 pb-8">
                    <motion.div
                        initial={{opacity: 0, y: 8}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.5}}
                    >
                        <div className="flex items-center gap-2 flex-wrap mb-5">
                            <Badge tone={market.tier === "sUSDe" ? "forest" : "twilight"} size="md">
                                {market.tier} {apy > 0 && `· ${(apy * 100).toFixed(0)}% APY`}
                            </Badge>
                            <Badge tone="mute" size="md">
                                {market.category}
                            </Badge>
                            {market.alloraTopicId && (
                                <Badge tone="terracotta" size="md">
                                    Allora topic #{market.alloraTopicId}
                                </Badge>
                            )}
                            {market.status === "active" && (
                                <Badge tone="ink" size="md">
                                    <LiveDot />
                                    Active · {timeUntil(market.resolutionAt)} left
                                </Badge>
                            )}
                            {market.status === "resolving" && (
                                <Badge tone="terracotta" size="md">
                                    <Flag size={10} weight="regular" />
                                    Resolving · awaiting swarm
                                </Badge>
                            )}
                            {market.status === "resolved" && (
                                <Badge tone={market.resolvedOutcome === "YES" ? "forest" : "crimson"} size="md">
                                    Resolved · {market.resolvedOutcome}
                                </Badge>
                            )}
                        </div>

                        <h1 className="font-display text-display-lg text-ink leading-[1.05] max-w-[24ch]">
                            {market.question}
                        </h1>

                        <div className="mt-6 flex items-center gap-4 text-[12px] font-mono text-ink-mute tabular">
                            <span>Created by {shortAddress(market.creator)}</span>
                            <span className="text-paper-edge">·</span>
                            <span>{formatDateLong(market.createdAt)}</span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Body — three column on desktop */}
            <section className="max-w-[1440px] mx-auto px-6 md:px-10 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* MAIN */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Outcome */}
                        {market.status === "resolved" ? (
                            <ResolvedBanner outcome={market.resolvedOutcome!} />
                        ) : (
                            <div className="border border-paper-line bg-paper p-5 md:p-6">
                                <div className="flex items-baseline justify-between mb-4">
                                    <p className="eyebrow">Current price · LMSR</p>
                                    <span className="text-[11px] font-mono uppercase tracking-eyebrow text-ink-mute tabular">
                                        Liquidity b = 1000
                                    </span>
                                </div>
                                <OutcomeBar
                                    yesPrice={market.yesPrice}
                                    noPrice={market.noPrice}
                                    size="lg"
                                />
                                <div className="mt-6 pt-5 border-t border-paper-line">
                                    <YieldBar
                                        accrued={market.yieldEarned}
                                        projected={apy * (Math.max(market.resolutionAt - market.createdAt, 0) / 31_536_000_000)}
                                        live={market.status === "active"}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Oracle swarm panel — show during resolving */}
                        {(market.status === "resolving" || market.status === "resolved") &&
                            oracleVotes.length > 0 && (
                                <OracleSwarmPanel
                                    marketId={market.id}
                                    votes={oracleVotes}
                                    finalized={market.status === "resolved"}
                                    finalOutcome={market.resolvedOutcome}
                                />
                            )}

                        {/* Tabs */}
                        <div className="border-b border-paper-line">
                            <div className="flex items-center gap-1">
                                {(
                                    [
                                        {key: "activity", label: "Activity", icon: Lightning},
                                        {key: "stats", label: "Stats", icon: ChartLine},
                                        {key: "allora", label: "Allora", icon: ChartLine},
                                        {key: "nansen", label: "Nansen", icon: ChartLine},
                                    ] as const
                                ).map((t) => {
                                    const active = tab === t.key;
                                    return (
                                        <button
                                            key={t.key}
                                            onClick={() => setTab(t.key)}
                                            className={cn(
                                                "relative px-4 py-3 font-mono uppercase tracking-eyebrow text-[11px] inline-flex items-center gap-1.5 transition-colors",
                                                active ? "text-ink" : "text-ink-mute hover:text-ink"
                                            )}
                                        >
                                            <t.icon size={11} weight="regular" />
                                            {t.label}
                                            {active && (
                                                <motion.span
                                                    layoutId="md-tab-underline"
                                                    className="absolute inset-x-3 -bottom-px h-px bg-terracotta"
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tab body */}
                        <div className="min-h-[400px]">
                            {tab === "activity" && (
                                <div>
                                    <p className="eyebrow mb-4">
                                        {decisions.length} events · most recent first
                                    </p>
                                    <ActivityFeed
                                        decisions={decisions}
                                        liveDecisionId={decisions[0]?.id}
                                    />
                                </div>
                            )}
                            {tab === "stats" && <StatsTab market={market} />}
                            {tab === "allora" && (
                                <SignalPanel
                                    title="Allora forecast"
                                    eyebrow="Topic stream"
                                    body={
                                        market.alloraTopicId
                                            ? "Live forecast bound to this market on creation. Trader agents read this signal at every poll cycle and size positions against the LMSR price."
                                            : "No Allora topic linked to this market."
                                    }
                                    figure={market.alloraTopicId ? "62%" : "—"}
                                    figureLabel={market.alloraTopicId ? "P(YES) · last poll" : "—"}
                                />
                            )}
                            {tab === "nansen" && (
                                <SignalPanel
                                    title="Smart-money flow"
                                    eyebrow="Nansen netflow"
                                    body="Smart-money wallets accumulating the underlying asset are tracked off-chain by the nansen-watcher bot and surfaced to traders as a real-time signal. Returns neutral when no API key configured."
                                    figure="3"
                                    figureLabel="Wallets long this week"
                                />
                            )}
                        </div>
                    </div>

                    {/* SIDEBAR */}
                    <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 lg:self-start">
                        {market.status === "active" && (
                            <PositionForm market={market} walletConnected={false} />
                        )}

                        {myPosition && (
                            <div className="border border-paper-line bg-paper p-5">
                                <p className="eyebrow mb-3">Your position</p>
                                <p className="font-display text-2xl mb-1">
                                    <span
                                        className={
                                            myPosition.side === "YES"
                                                ? "text-forest"
                                                : "text-crimson"
                                        }
                                    >
                                        {myPosition.side}
                                    </span>{" "}
                                    · {myPosition.shares} shares
                                </p>
                                <p className="font-mono text-[11px] uppercase tracking-eyebrow text-ink-mute tabular">
                                    Entered @ {myPosition.enteredPrice.toFixed(2)} ·{" "}
                                    {formatUsdt0(myPosition.stakedUsdt0)} USDT0
                                </p>
                                {market.status === "active" && (
                                    <p className="mt-3 pt-3 border-t border-paper-line font-mono text-[12px] tabular">
                                        Currently:{" "}
                                        <span className="text-forest">
                                            +{formatUsdt0(
                                                myPosition.shares *
                                                    ((myPosition.side === "YES"
                                                        ? market.yesPrice
                                                        : market.noPrice) -
                                                        myPosition.enteredPrice)
                                            )}{" "}
                                            USDT0
                                        </span>
                                    </p>
                                )}
                            </div>
                        )}

                        <SidebarStats market={market} />
                    </aside>
                </div>
            </section>
        </main>
    );
}

function ResolvedBanner({outcome}: {outcome: "YES" | "NO" | "INVALID"}) {
    const tone = outcome === "YES" ? "forest" : outcome === "NO" ? "crimson" : "ink";
    return (
        <motion.div
            initial={{opacity: 0, y: 8}}
            animate={{opacity: 1, y: 0}}
            className={cn(
                "border-2 p-6 md:p-8",
                tone === "forest" && "border-forest bg-forest-faint",
                tone === "crimson" && "border-crimson bg-crimson-faint",
                tone === "ink" && "border-ink bg-paper-warm"
            )}
        >
            <p className="eyebrow mb-2">Resolved</p>
            <p className="font-display text-display-md leading-tight">
                Final outcome:{" "}
                <span
                    className={cn(
                        "font-display-italic",
                        tone === "forest" && "text-forest",
                        tone === "crimson" && "text-crimson",
                        tone === "ink" && "text-ink-mute"
                    )}
                >
                    {outcome}
                </span>
            </p>
        </motion.div>
    );
}

function StatsTab({market}: {market: ReturnType<typeof findMarket>}) {
    if (!market) return null;
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-paper-line border border-paper-line">
            {[
                {k: "Volume", v: `${formatUsdt0(market.volumeUsdt0, {compact: true})} USDT0`},
                {k: "Positions", v: market.positionsCount.toString()},
                {k: "AI traders", v: market.aiTradersActive.toString()},
                {
                    k: "Yield earned",
                    v: market.yieldEarned > 0 ? formatPercent(market.yieldEarned) : "—",
                },
                {k: "Resolution", v: formatDateLong(market.resolutionAt)},
                {k: "Tier", v: market.tier},
                {k: "Created", v: formatDateLong(market.createdAt)},
                {k: "Creator", v: shortAddress(market.creator)},
            ].map((s) => (
                <div key={s.k} className="bg-paper p-5">
                    <p className="eyebrow mb-1.5">{s.k}</p>
                    <p className="font-display text-2xl text-ink tabular leading-none">{s.v}</p>
                </div>
            ))}
        </div>
    );
}

function SignalPanel({
    title,
    eyebrow,
    body,
    figure,
    figureLabel,
}: {
    title: string;
    eyebrow: string;
    body: string;
    figure: string;
    figureLabel: string;
}) {
    return (
        <div className="border border-paper-line bg-paper p-6 md:p-8">
            <p className="eyebrow mb-4">{eyebrow}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-2">
                    <h3 className="font-display text-3xl text-ink mb-3">{title}</h3>
                    <p className="text-ink-soft leading-relaxed">{body}</p>
                </div>
                <div className="border-l border-paper-line pl-6">
                    <p className="font-display text-display-md text-ink tabular leading-none">
                        {figure}
                    </p>
                    <p className="eyebrow mt-2">{figureLabel}</p>
                </div>
            </div>
        </div>
    );
}

function SidebarStats({market}: {market: ReturnType<typeof findMarket>}) {
    if (!market) return null;
    return (
        <div className="border border-paper-line bg-paper">
            <div className="px-5 py-4 border-b border-paper-line bg-paper-warm">
                <p className="eyebrow">Market stats</p>
            </div>
            <dl className="divide-y divide-paper-line">
                <Stat label="Volume" value={`${formatUsdt0(market.volumeUsdt0, {compact: true})} USDT0`} />
                <Stat label="Positions" value={market.positionsCount.toString()} />
                <Stat label="AI traders" value={market.aiTradersActive.toString()} />
                <Stat label="Resolution" value={formatDateLong(market.resolutionAt)} />
                <Stat
                    label="Yield"
                    value={
                        market.yieldEarned > 0
                            ? `+${formatPercent(market.yieldEarned)}`
                            : "—"
                    }
                    tone="forest"
                />
            </dl>
        </div>
    );
}

function Stat({label, value, tone}: {label: string; value: string; tone?: "forest"}) {
    return (
        <div className="px-5 py-3 flex items-baseline justify-between font-mono text-[12px] tabular">
            <span className="uppercase tracking-eyebrow text-[10px] text-ink-mute">{label}</span>
            <span className={cn(tone === "forest" ? "text-forest" : "text-ink")}>{value}</span>
        </div>
    );
}
