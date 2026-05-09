"use client";

import {motion} from "framer-motion";
import {ArrowRight, Stamp, User} from "@phosphor-icons/react/dist/ssr";
import {AgentReasoningCard} from "./agent-reasoning-card";
import {Badge} from "@/components/primitives/badge";
import {emblemFor} from "@/lib/emblem";
import {formatUsdt0, relativeTime, shortAddress} from "@/lib/format";
import type {Decision} from "@/lib/types";
import {findAgent} from "@/lib/mock-data";
import {cn} from "@/lib/cn";

interface ActivityFeedProps {
    decisions: Decision[];
    /** ID of the most recent live decision — animates in with streamed reasoning */
    liveDecisionId?: string;
}

export function ActivityFeed({decisions, liveDecisionId}: ActivityFeedProps) {
    if (decisions.length === 0) {
        return (
            <div className="border border-paper-line p-12 text-center">
                <p className="font-display-italic text-2xl text-ink-mute mb-2">
                    No activity yet.
                </p>
                <p className="text-sm text-ink-mute">The first move is yours.</p>
            </div>
        );
    }

    return (
        <ol className="space-y-3 relative">
            {/* Vertical guide line */}
            <span
                aria-hidden
                className="absolute left-[15px] top-3 bottom-3 w-px bg-paper-line"
            />

            {decisions.map((d, i) => (
                <motion.li
                    key={d.id}
                    initial={i < 3 ? {opacity: 0, y: 12} : false}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1]}}
                    className="relative pl-10"
                >
                    {/* Node */}
                    <span
                        className={cn(
                            "absolute left-2 top-3 w-4 h-4 border-2 bg-night",
                            d.kind === "ENTER" && d.agentType === "Trader"
                                ? "border-amber"
                                : d.kind === "VOTE"
                                  ? "border-violet"
                                  : d.kind === "FINALIZE"
                                    ? "border-amber"
                                    : "border-border-strong"
                        )}
                    />

                    {renderEntry(d, liveDecisionId === d.id)}
                </motion.li>
            ))}
        </ol>
    );
}

function renderEntry(d: Decision, isLive: boolean) {
    if (d.kind === "ENTER" && d.agentType === "Trader" && d.payload.reasoning) {
        return (
            <AgentReasoningCard
                agentId={d.agentId}
                side={d.payload.side ?? "YES"}
                amount={d.payload.amount ?? 0}
                enteredPrice={d.payload.price ?? 0.5}
                timestamp={d.timestamp}
                alloraForecast={d.payload.alloraForecast}
                nansenWallets={d.payload.nansenWallets}
                confidence={d.payload.confidence}
                reasoning={d.payload.reasoning}
                ipfsHash={d.payload.ipfsHash}
                streamReasoning={isLive}
                defaultOpen={isLive}
            />
        );
    }

    if (d.kind === "ENTER" && d.agentType === "Bettor") {
        const agent = findAgent(d.agentId);
        const tone = d.payload.side === "YES" ? "forest" : "crimson";
        return (
            <div className="border border-paper-line bg-paper p-4 flex items-center gap-3">
                <div className="w-9 h-9 border border-paper-line bg-paper-warm grid place-items-center shrink-0">
                    <User size={14} weight="regular" className="text-ink-mute" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-mono text-[11px] text-ink tabular">
                            {agent ? shortAddress(agent.owner) : `Bettor #${d.agentId}`}
                        </span>
                        <Badge tone={tone} size="sm">
                            ENTER {d.payload.side}
                        </Badge>
                        <span className="ml-auto font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute">
                            {relativeTime(d.timestamp)}
                        </span>
                    </div>
                    <p className="text-[13px] text-ink-soft">
                        Entered{" "}
                        <span className="font-mono tabular">
                            {formatUsdt0(d.payload.amount ?? 0)} USDT0
                        </span>{" "}
                        on{" "}
                        <span className={d.payload.side === "YES" ? "text-forest" : "text-crimson"}>
                            {d.payload.side}
                        </span>{" "}
                        @ {(d.payload.price ?? 0).toFixed(2)}
                    </p>
                </div>
            </div>
        );
    }

    if (d.kind === "VOTE") {
        const tone = d.payload.outcome === "YES" ? "forest" : d.payload.outcome === "NO" ? "crimson" : "mute";
        return (
            <div className="border border-paper-line bg-paper p-4 flex items-center gap-3">
                <img
                    src={emblemFor(d.agentId, "twilight")}
                    alt=""
                    className="w-9 h-9 border border-paper-line bg-paper-warm shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-mono text-[11px] text-ink uppercase tracking-eyebrow">
                            Oracle #{d.agentId}
                        </span>
                        <Badge tone={tone} size="sm">
                            <Stamp size={9} weight="regular" />
                            VOTE {d.payload.outcome}
                        </Badge>
                        <span className="ml-auto font-mono text-[10px] uppercase tracking-eyebrow text-ink-mute">
                            {relativeTime(d.timestamp)}
                        </span>
                    </div>
                    <p className="text-[13px] text-ink-soft font-display-italic line-clamp-1">
                        “{d.payload.reasoning}”
                    </p>
                </div>
            </div>
        );
    }

    if (d.kind === "FINALIZE") {
        return (
            <div className="border-2 border-amber bg-night-deep text-bone p-4 flex items-center gap-3 relative">
                <span className="absolute top-0 left-0 right-0 h-px bg-amber" style={{boxShadow: "0 0 8px rgba(242, 163, 65, 0.6)"}} />
                <div className="w-9 h-9 border border-amber bg-transparent grid place-items-center shrink-0">
                    <Stamp size={14} weight="regular" className="text-amber" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-mono text-[11px] uppercase tracking-eyebrow text-amber">
                            Resolution finalized
                        </span>
                        <span className="ml-auto font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                            {relativeTime(d.timestamp)}
                        </span>
                    </div>
                    <p className="font-display font-bold text-2xl">
                        Final outcome:{" "}
                        <span
                            className={cn(
                                d.payload.outcome === "YES" && "text-mint",
                                d.payload.outcome === "NO" && "text-coral",
                                d.payload.outcome === "INVALID" && "text-fg-mute"
                            )}
                        >
                            {d.payload.outcome}
                        </span>
                    </p>
                </div>
            </div>
        );
    }

    if (d.kind === "CREATE_MARKET") {
        return (
            <div className="border border-dashed border-paper-edge bg-paper p-4 flex items-center gap-3">
                <div className="w-9 h-9 grid place-items-center shrink-0">
                    <ArrowRight size={14} weight="regular" className="text-ink-faint" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-eyebrow text-ink-mute">
                        Market created · {relativeTime(d.timestamp)}
                    </p>
                </div>
            </div>
        );
    }

    return null;
}
