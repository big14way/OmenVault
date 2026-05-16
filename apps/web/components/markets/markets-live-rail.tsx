"use client";

import Link from "next/link";
import {useEffect, useMemo, useRef, useState} from "react";
import {motion} from "framer-motion";
import {ArrowRight, Stamp, User} from "@phosphor-icons/react/dist/ssr";
import {LiveDot} from "@/components/primitives/badge";
import {emblemFor} from "@/lib/emblem";
import {MOCK_DECISIONS, MOCK_MARKETS} from "@/lib/mock-data";
import {TIER_APY, type Decision, type Market} from "@/lib/types";
import {relativeTime} from "@/lib/format";
import {cn} from "@/lib/cn";
import {useMarkets} from "@/lib/web3/hooks/use-markets";
import {useDecisions} from "@/lib/web3/hooks/use-decisions";
import {useAgents} from "@/lib/web3/hooks/use-agents";
import {deployment} from "@/lib/web3/config";

/**
 * Bloomberg-style activity rail on the right of /markets.
 *   1. Protocol pulse — total USDT0/sec yield ticking across active markets,
 *      plus active-market count, total volume, agents online.
 *   2. Recent activity ledger — last decisions from DecisionLog, newest first.
 *
 * Falls back to MOCK_MARKETS / MOCK_DECISIONS only when the chain env isn't
 * configured (pre-deploy dev mode). Once env is set, the rail reflects
 * exclusively on-chain state — chain decisions carry less inline payload than
 * the mocks, so the row renders the minimal shape gracefully.
 */
export function MarketsLiveRail({className}: {className?: string}) {
    const {data: onChainMarkets} = useMarkets();
    const {data: onChainDecisions} = useDecisions();
    const {data: onChainAgents} = useAgents();
    const factoryConfigured = Boolean(deployment.marketFactory);
    const decisionLogConfigured = Boolean(deployment.decisionLog);

    const markets: Market[] = factoryConfigured ? (onChainMarkets ?? []) : MOCK_MARKETS;
    const decisions: Decision[] = decisionLogConfigured
        ? (onChainDecisions ?? [])
        : MOCK_DECISIONS;

    // Compute total USDT0/sec yield being earned across all active markets.
    const perSecond = useMemo(
        () =>
            markets
                .filter((m) => m.status === "active")
                .reduce((sum, m) => {
                    const apy = TIER_APY[m.tier];
                    if (apy <= 0) return sum;
                    return sum + (m.volumeUsdt0 * apy) / 31_536_000;
                }, 0),
        [markets],
    );

    const [yieldTotal, setYieldTotal] = useState(0);
    const startedAt = useRef(0);

    useEffect(() => {
        startedAt.current = performance.now();
        setYieldTotal(0);
        let raf = 0;
        const update = () => {
            const elapsedSec = (performance.now() - startedAt.current) / 1000;
            setYieldTotal(perSecond * elapsedSec);
            raf = requestAnimationFrame(update);
        };
        raf = requestAnimationFrame(update);
        return () => cancelAnimationFrame(raf);
    }, [perSecond]);

    const activeCount = markets.filter((m) => m.status === "active").length;
    const totalVolume = markets.reduce((s, m) => s + m.volumeUsdt0, 0);
    const totalAgents = useMemo(() => {
        // Prefer on-chain count when wired; mock data exposes per-market aiTradersActive sums.
        if (deployment.agentRegistry && onChainAgents) return onChainAgents.length;
        return markets.reduce((s, m) => s + (m.aiTradersActive ?? 0), 0);
    }, [onChainAgents, markets]);

    const recent = decisions.slice(0, 8);

    return (
        <aside
            className={cn(
                "border border-border bg-surface relative overflow-hidden",
                className,
            )}
        >
            {/* Header strip */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-soft">
                <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                    <LiveDot />
                    Mantle Sepolia
                </span>
                <span className="font-mono text-[10px] uppercase tracking-eyebrow text-amber tabular">
                    LIVE
                </span>
            </div>

            {/* Protocol pulse */}
            <div className="px-4 py-5 border-b border-border bg-night relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-mint/[0.06] to-transparent pointer-events-none" />

                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute mb-2">
                    Protocol pulse
                </p>
                <p className="font-display font-extrabold text-2xl text-mint tabular leading-none mb-1">
                    +{yieldTotal.toFixed(7)}
                </p>
                <p className="font-mono text-[11px] tabular text-fg-mute">
                    USDT0 / sec accrued
                </p>

                <div className="mt-5 grid grid-cols-3 gap-3">
                    <Stat label="Active" value={activeCount.toString()} accent="text-bone" />
                    <Stat
                        label="Volume"
                        value={
                            totalVolume >= 1000
                                ? `${(totalVolume / 1000).toFixed(1)}k`
                                : totalVolume.toFixed(0)
                        }
                        accent="text-bone"
                    />
                    <Stat
                        label="Agents"
                        value={totalAgents.toString()}
                        accent="text-amber"
                        live
                    />
                </div>
            </div>

            {/* Activity ledger */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                    Activity ledger
                </p>
                <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-faint tabular">
                    {recent.length} recent
                </span>
            </div>

            {recent.length === 0 ? (
                <p className="px-4 py-4 font-mono text-[11px] text-fg-mute">
                    {decisionLogConfigured
                        ? "No decisions on chain yet. Bots write here as they trade and vote."
                        : "Configure NEXT_PUBLIC_DECISION_LOG_ADDRESS to see live activity."}
                </p>
            ) : (
                <ul className="divide-y divide-border-soft">
                    {recent.map((d, i) => (
                        <ActivityRow key={d.id} decision={d} delay={i * 0.04} />
                    ))}
                </ul>
            )}

            <div className="px-4 py-3 border-t border-border">
                <Link
                    href="/audit"
                    className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-eyebrow text-bone hover:text-amber underline-draw"
                >
                    Open full audit
                    <ArrowRight size={11} weight="regular" />
                </Link>
            </div>
        </aside>
    );
}

function Stat({
    label,
    value,
    accent,
    live,
}: {
    label: string;
    value: string;
    accent: string;
    live?: boolean;
}) {
    return (
        <div className="border-l border-border-strong pl-2.5">
            <p className="font-mono text-[9px] uppercase tracking-eyebrow text-fg-mute mb-1 inline-flex items-center gap-1">
                {live && (
                    <span
                        className="w-1 h-1 rounded-full bg-amber"
                        style={{boxShadow: "0 0 4px rgba(242, 163, 65, 0.7)"}}
                    />
                )}
                {label}
            </p>
            <p className={cn("font-display font-bold text-lg tabular leading-none", accent)}>
                {value}
            </p>
        </div>
    );
}

/**
 * Renders a single Decision row. Handles both mock data (rich payload with
 * side/outcome/reasoning inline) and chain data (just agentId + kind + cid).
 */
function ActivityRow({
    decision,
    delay,
}: {
    decision: Decision;
    delay: number;
}) {
    const isTrader = decision.kind === "ENTER" && decision.agentType === "Trader";
    const isOracle = decision.kind === "VOTE";
    const isFinalize = decision.kind === "FINALIZE";
    const isBettor = decision.kind === "ENTER" && decision.agentType === "Bettor";

    const role = isTrader
        ? `TRADER#${decision.agentId}`
        : isOracle
          ? `ORACLE#${decision.agentId}`
          : isFinalize
            ? "FINALIZE"
            : isBettor
              ? "BETTOR"
              : `${decision.agentType.toUpperCase()}#${decision.agentId}`;

    const roleColor = isTrader
        ? "text-amber"
        : isOracle || isFinalize
          ? "text-violet"
          : "text-bone";

    const action = (() => {
        if (isTrader || isBettor) {
            const side = decision.payload.side;
            return (
                <>
                    ENTER
                    {side && (
                        <>
                            {" "}
                            <span className={side === "YES" ? "text-mint" : "text-coral"}>{side}</span>
                        </>
                    )}
                </>
            );
        }
        if (isOracle) {
            const outcome = decision.payload.outcome;
            return (
                <>
                    VOTE
                    {outcome && (
                        <>
                            {" "}
                            <span
                                className={
                                    outcome === "YES"
                                        ? "text-mint"
                                        : outcome === "NO"
                                          ? "text-coral"
                                          : "text-fg-mute"
                                }
                            >
                                {outcome}
                            </span>
                        </>
                    )}
                </>
            );
        }
        if (isFinalize) {
            const outcome = decision.payload.outcome;
            return outcome ? (
                <span
                    className={
                        outcome === "YES"
                            ? "text-mint"
                            : outcome === "NO"
                              ? "text-coral"
                              : "text-fg-mute"
                    }
                >
                    {outcome}
                </span>
            ) : (
                <span className="text-fg-mute">SETTLED</span>
            );
        }
        return null;
    })();

    const marketLabel = decision.marketId
        ? decision.marketId.startsWith("0x") && decision.marketId.length === 42
            ? `${decision.marketId.slice(0, 6)}…${decision.marketId.slice(-4)}`
            : `MKT-${decision.marketId.padStart(3, "0")}`
        : null;

    return (
        <motion.li
            initial={{opacity: 0, x: -6}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.4, delay, ease: [0.22, 1, 0.36, 1]}}
        >
            <Link
                href={decision.marketId ? `/markets/${decision.marketId}` : "/audit"}
                className="block px-4 py-2.5 hover:bg-night transition-colors group"
            >
                <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-[10px] tabular text-fg-faint shrink-0 w-9">
                        {relativeTime(decision.timestamp).replace(" ago", "")}
                    </span>
                    {isTrader || isOracle ? (
                        <img
                            src={emblemFor(decision.agentId, isOracle ? "twilight" : "ink")}
                            alt=""
                            className="w-3.5 h-3.5 invert opacity-90 shrink-0 translate-y-px"
                        />
                    ) : isBettor ? (
                        <User
                            size={11}
                            weight="regular"
                            className="text-bone-soft shrink-0 translate-y-px"
                        />
                    ) : (
                        <Stamp
                            size={11}
                            weight="regular"
                            className="text-violet shrink-0 translate-y-px"
                        />
                    )}
                    <span
                        className={cn(
                            "font-mono text-[10.5px] uppercase tracking-eyebrow shrink-0",
                            roleColor,
                        )}
                    >
                        {role}
                    </span>
                </div>
                <div className="mt-0.5 ml-[3.65rem] font-mono text-[11px] uppercase tracking-eyebrow text-bone-soft group-hover:text-bone transition-colors">
                    {action}
                    {marketLabel && (
                        <>
                            {action && " "}
                            <span className="text-fg-faint">· {marketLabel}</span>
                        </>
                    )}
                </div>
            </Link>
        </motion.li>
    );
}
