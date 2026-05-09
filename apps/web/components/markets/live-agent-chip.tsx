"use client";

import {motion} from "framer-motion";
import {Robot, Stamp, User} from "@phosphor-icons/react/dist/ssr";
import {emblemFor} from "@/lib/emblem";
import {relativeTime, shortAddress} from "@/lib/format";
import {findAgent} from "@/lib/mock-data";
import type {Decision} from "@/lib/types";
import {cn} from "@/lib/cn";

interface LiveAgentChipProps {
    decision: Decision;
    className?: string;
}

/**
 * Compact one-line chip showing the most recent decision on a market.
 * Lives inside MarketCard, above the stats row. Pulsing dot + emblem +
 * actor + action. Updates as new decisions land.
 */
export function LiveAgentChip({decision, className}: LiveAgentChipProps) {
    const agent = findAgent(decision.agentId);

    if (decision.kind === "ENTER" && decision.agentType === "Trader") {
        return (
            <Chip
                emblem={emblemFor(decision.agentId, "ink")}
                accent="amber"
                label={`Trader #${decision.agentId}`}
                action={
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
                }
                timestamp={decision.timestamp}
                className={className}
            />
        );
    }

    if (decision.kind === "ENTER" && decision.agentType === "Bettor") {
        return (
            <Chip
                Icon={User}
                accent="bone"
                label={agent ? shortAddress(agent.owner) : "Bettor"}
                action={
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
                }
                timestamp={decision.timestamp}
                className={className}
            />
        );
    }

    if (decision.kind === "VOTE") {
        return (
            <Chip
                emblem={emblemFor(decision.agentId, "twilight")}
                accent="violet"
                label={`Oracle #${decision.agentId}`}
                action={
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
                }
                timestamp={decision.timestamp}
                className={className}
            />
        );
    }

    if (decision.kind === "FINALIZE") {
        return (
            <Chip
                Icon={Stamp}
                accent="amber"
                label="Finalized"
                action={
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
                }
                timestamp={decision.timestamp}
                className={className}
            />
        );
    }

    if (decision.kind === "CREATE_MARKET") {
        return (
            <Chip
                Icon={Robot}
                accent="bone"
                label="Created"
                action={<span className="text-fg-mute">market opened</span>}
                timestamp={decision.timestamp}
                className={className}
            />
        );
    }

    return null;
}

function Chip({
    emblem,
    Icon,
    accent,
    label,
    action,
    timestamp,
    className,
}: {
    emblem?: string;
    Icon?: typeof Robot;
    accent: "amber" | "violet" | "bone";
    label: string;
    action: React.ReactNode;
    timestamp: number;
    className?: string;
}) {
    const accentBorder = {
        amber: "border-l-amber",
        violet: "border-l-violet",
        bone: "border-l-bone/60",
    }[accent];
    const accentText = {
        amber: "text-amber",
        violet: "text-violet",
        bone: "text-bone",
    }[accent];

    return (
        <div
            className={cn(
                "relative flex items-center gap-2.5 pl-2.5 pr-2 py-1.5 bg-night/60 border border-border-soft border-l-2",
                accentBorder,
                className
            )}
        >
            {emblem ? (
                <img
                    src={emblem}
                    alt=""
                    className="w-5 h-5 invert opacity-90 shrink-0 -ml-0.5"
                />
            ) : Icon ? (
                <Icon
                    size={12}
                    weight="regular"
                    className={cn("shrink-0", accentText)}
                />
            ) : null}

            <span
                className={cn(
                    "font-mono text-[10.5px] uppercase tracking-eyebrow shrink-0",
                    accentText
                )}
            >
                {label}
            </span>

            <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-bone-soft shrink-0">
                {action}
            </span>

            <span className="ml-auto inline-flex items-center gap-1.5">
                <span className="relative inline-flex h-2 w-2 items-center justify-center">
                    {/* Expanding ring — explicit framer animation so it always runs */}
                    <motion.span
                        animate={{scale: [1, 2.6], opacity: [0.7, 0]}}
                        transition={{
                            duration: 1.6,
                            repeat: Infinity,
                            ease: "easeOut",
                        }}
                        className="absolute inline-flex h-2 w-2 rounded-full bg-amber"
                    />
                    {/* Core dot, breathing slightly */}
                    <motion.span
                        animate={{opacity: [0.85, 1, 0.85]}}
                        transition={{
                            duration: 1.6,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                        className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber"
                        style={{boxShadow: "0 0 8px rgba(242, 163, 65, 0.9)"}}
                    />
                </span>
                <span className="font-mono text-[10px] tabular text-fg-mute shrink-0">
                    {relativeTime(timestamp)}
                </span>
            </span>
        </div>
    );
}
