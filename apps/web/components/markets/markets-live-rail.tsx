"use client";

import Link from "next/link";
import {useEffect, useRef, useState} from "react";
import {motion} from "framer-motion";
import {ArrowRight, Robot, Stamp, User} from "@phosphor-icons/react/dist/ssr";
import {LiveDot} from "@/components/primitives/badge";
import {emblemFor} from "@/lib/emblem";
import {MOCK_DECISIONS, MOCK_MARKETS} from "@/lib/mock-data";
import {TIER_APY} from "@/lib/types";
import {relativeTime} from "@/lib/format";
import {cn} from "@/lib/cn";

/**
 * Bloomberg-style activity rail. Sticks to the right of /markets.
 * Two zones:
 *   1. Protocol pulse — live yield/sec ticking across all open markets.
 *   2. Recent activity ledger — last N decisions, newest first.
 */
export function MarketsLiveRail({className}: {className?: string}) {
    // Compute total USDT0/sec yield being earned across all active markets.
    const perSecond = MOCK_MARKETS.filter((m) => m.status === "active").reduce((sum, m) => {
        const apy = TIER_APY[m.tier];
        if (apy <= 0) return sum;
        return sum + (m.volumeUsdt0 * apy) / 31_536_000;
    }, 0);

    const [yieldTotal, setYieldTotal] = useState(0);
    const startedAt = useRef(0);

    useEffect(() => {
        startedAt.current = performance.now();
        let raf = 0;
        const update = () => {
            const elapsedSec = (performance.now() - startedAt.current) / 1000;
            setYieldTotal(perSecond * elapsedSec);
            raf = requestAnimationFrame(update);
        };
        raf = requestAnimationFrame(update);
        return () => cancelAnimationFrame(raf);
    }, [perSecond]);

    const activeCount = MOCK_MARKETS.filter((m) => m.status === "active").length;
    const totalAgents = MOCK_MARKETS.reduce((s, m) => s + m.aiTradersActive, 0);
    const recent = MOCK_DECISIONS.slice(0, 8);

    return (
        <aside
            className={cn(
                "border border-border bg-surface relative overflow-hidden",
                className
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
                {/* Faint mint halo */}
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
                        value={(MOCK_MARKETS.reduce((s, m) => s + m.volumeUsdt0, 0) / 1000).toFixed(0) + "k"}
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

            <ul className="divide-y divide-border-soft">
                {recent.map((d, i) => (
                    <ActivityRow key={d.id} decision={d} delay={i * 0.04} />
                ))}
            </ul>

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

function ActivityRow({
    decision,
    delay,
}: {
    decision: (typeof MOCK_DECISIONS)[number];
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
              : decision.agentType.toUpperCase();

    const roleColor = isTrader
        ? "text-amber"
        : isOracle || isFinalize
          ? "text-violet"
          : "text-bone";

    const action = (() => {
        if (isTrader || isBettor) {
            return (
                <>
                    ENTER{" "}
                    <span
                        className={
                            decision.payload.side === "YES" ? "text-mint" : "text-coral"
                        }
                    >
                        {decision.payload.side}
                    </span>
                </>
            );
        }
        if (isOracle) {
            return (
                <>
                    VOTE{" "}
                    <span
                        className={
                            decision.payload.outcome === "YES"
                                ? "text-mint"
                                : decision.payload.outcome === "NO"
                                  ? "text-coral"
                                  : "text-fg-mute"
                        }
                    >
                        {decision.payload.outcome}
                    </span>
                </>
            );
        }
        if (isFinalize) {
            return (
                <span
                    className={
                        decision.payload.outcome === "YES"
                            ? "text-mint"
                            : decision.payload.outcome === "NO"
                              ? "text-coral"
                              : "text-fg-mute"
                    }
                >
                    {decision.payload.outcome}
                </span>
            );
        }
        return null;
    })();

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
                            roleColor
                        )}
                    >
                        {role}
                    </span>
                </div>
                <div className="mt-0.5 ml-[3.65rem] font-mono text-[11px] uppercase tracking-eyebrow text-bone-soft group-hover:text-bone transition-colors">
                    {action}{" "}
                    {decision.marketId && (
                        <span className="text-fg-faint">
                            · MKT-{decision.marketId.padStart(3, "0")}
                        </span>
                    )}
                </div>
            </Link>
        </motion.li>
    );
}
