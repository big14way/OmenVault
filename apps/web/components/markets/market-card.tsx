"use client";

import Link from "next/link";
import {motion} from "framer-motion";
import {ArrowUpRight, Robot} from "@phosphor-icons/react/dist/ssr";
import {Badge} from "@/components/primitives/badge";
import {OutcomeBar} from "./outcome-bar";
import {YieldRibbon} from "./yield-ribbon";
import {LiveAgentChip} from "./live-agent-chip";
import {TIER_APY, type Market} from "@/lib/types";
import {formatUsdt0, timeUntil} from "@/lib/format";
import {decisionsForMarket} from "@/lib/mock-data";
import {cn} from "@/lib/cn";

interface MarketCardProps {
    market: Market;
    className?: string;
    index?: number;
}

const TIER_TONE = {
    USDT0: "mute",
    USDY: "violet",
    sUSDe: "mint",
} as const;

const STATUS_LABEL: Record<Market["status"], string> = {
    active: "Active",
    resolving: "Resolving",
    resolved: "Resolved",
    disputed: "Disputed",
};

export function MarketCard({market, className, index = 0}: MarketCardProps) {
    const apy = TIER_APY[market.tier];
    const isResolved = market.status === "resolved";
    const recent = decisionsForMarket(market.id)[0];

    return (
        <motion.div
            initial={{opacity: 0, y: 14}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true, margin: "-60px"}}
            transition={{
                duration: 0.5,
                delay: Math.min(index * 0.05, 0.3),
                ease: [0.22, 1, 0.36, 1],
            }}
            className={cn("group h-full", className)}
        >
            <Link
                href={`/markets/${market.id}`}
                className="relative flex flex-col h-full bg-surface border border-border hover:border-amber/50 transition-all duration-300 ease-editorial overflow-hidden"
            >
                {/* Hover ember on top edge */}
                <span
                    className="absolute top-0 left-0 right-0 h-px bg-amber scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-700 ease-editorial pointer-events-none"
                    style={{boxShadow: "0 0 8px rgba(242, 163, 65, 0.5)"}}
                />

                {/* Body */}
                <div className="flex-1 flex flex-col p-5 md:p-6">
                    {/* Header — tier + countdown */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-1.5">
                            <Badge tone={TIER_TONE[market.tier]} size="sm">
                                {market.tier}
                                {apy > 0 && (
                                    <span className="opacity-70 ml-1">
                                        {(apy * 100).toFixed(0)}%
                                    </span>
                                )}
                            </Badge>
                            <Badge tone="mute" size="sm">
                                {market.category}
                            </Badge>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute tabular">
                            {isResolved
                                ? STATUS_LABEL[market.status]
                                : timeUntil(market.resolutionAt)}
                        </span>
                    </div>

                    {/* Question */}
                    <h3 className="font-display font-bold text-[19px] text-bone leading-[1.25] mb-5 min-h-[2.5em] group-hover:text-amber transition-colors duration-300">
                        {market.question}
                    </h3>

                    {/* Outcome */}
                    {isResolved ? (
                        <div className="my-2 flex items-baseline gap-3 border-l-2 border-amber pl-3">
                            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                                Settled
                            </span>
                            <span
                                className={cn(
                                    "font-display font-extrabold text-3xl",
                                    market.resolvedOutcome === "YES"
                                        ? "text-mint"
                                        : market.resolvedOutcome === "NO"
                                          ? "text-coral"
                                          : "text-fg-mute"
                                )}
                            >
                                {market.resolvedOutcome}
                            </span>
                        </div>
                    ) : (
                        <OutcomeBar yesPrice={market.yesPrice} noPrice={market.noPrice} size="sm" />
                    )}

                    {/* Live agent chip — only on active markets with recent activity */}
                    {!isResolved && recent && (
                        <div className="mt-4">
                            <LiveAgentChip decision={recent} />
                        </div>
                    )}

                    {/* Stats — pushed to bottom of body */}
                    <div className="mt-auto pt-4 flex items-center justify-between text-[11px] font-mono tabular text-fg-mute">
                        <div className="flex items-center gap-3">
                            <span>
                                <span className="text-bone">
                                    {formatUsdt0(market.volumeUsdt0, {compact: true})}
                                </span>{" "}
                                vol
                            </span>
                            <span className="text-fg-dim">·</span>
                            <span>{market.positionsCount} pos</span>
                            {market.aiTradersActive > 0 && (
                                <>
                                    <span className="text-fg-dim">·</span>
                                    <span className="inline-flex items-center gap-1 text-amber">
                                        <Robot size={11} weight="regular" />
                                        {market.aiTradersActive}
                                    </span>
                                </>
                            )}
                        </div>
                        <ArrowUpRight
                            size={14}
                            weight="regular"
                            className="text-fg-mute group-hover:text-amber group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 ease-editorial"
                        />
                    </div>
                </div>

                {/* Yield Ribbon — the signature element */}
                {!isResolved && (
                    <YieldRibbon
                        accrued={market.yieldEarned}
                        projected={
                            apy *
                            (Math.max(market.resolutionAt - market.createdAt, 0) / 31_536_000_000)
                        }
                        apy={apy}
                    />
                )}
            </Link>
        </motion.div>
    );
}
