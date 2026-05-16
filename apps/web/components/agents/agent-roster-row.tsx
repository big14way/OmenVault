"use client";

import Link from "next/link";
import {ArrowRight, User} from "@phosphor-icons/react/dist/ssr";
import {emblemFor} from "@/lib/emblem";
import {formatPercent, formatUsdt0, relativeTime, shortAddress} from "@/lib/format";
import type {Agent} from "@/lib/types";
import {cn} from "@/lib/cn";

interface AgentRosterRowProps {
    agent: Agent;
}

const ACCENT: Record<Agent["type"], {border: string; label: string; tone: string}> = {
    Trader: {border: "border-l-amber", label: "TRADER", tone: "text-amber"},
    OracleNode: {border: "border-l-violet", label: "ORACLE", tone: "text-violet"},
    Bettor: {border: "border-l-bone/60", label: "BETTOR", tone: "text-bone"},
};

/**
 * Dense single-row roster entry. Same family as LedgerRow on /audit but
 * tuned for an agent listing: emblem on the left, then a mono ledger of
 * type/id/rep/performance/capital/lastSeen, right-anchored chevron.
 */
export function AgentRosterRow({agent}: AgentRosterRowProps) {
    const accent = ACCENT[agent.type];
    const isTrader = agent.type === "Trader";
    const isOracle = agent.type === "OracleNode";

    return (
        <Link
            href={`/agents/${agent.id}`}
            className={cn(
                "group relative flex items-center gap-4 md:gap-6 pl-3 pr-4 md:pl-5 md:pr-6 py-3.5 border-b border-border-soft last:border-b-0 border-l-2 hover:bg-surface transition-colors",
                accent.border
            )}
        >
            {/* Emblem or fallback */}
            <div className="shrink-0">
                {agent.type === "Bettor" ? (
                    <span className="inline-flex w-9 h-9 items-center justify-center border border-border bg-night text-fg-mute">
                        <User size={14} weight="regular" />
                    </span>
                ) : (
                    <img
                        src={emblemFor(agent.id, agent.type === "OracleNode" ? "twilight" : "ink")}
                        alt=""
                        className="w-9 h-9 border border-border bg-night invert opacity-95"
                    />
                )}
            </div>

            {/* Identity block */}
            <div className="flex flex-col min-w-0 w-[140px] md:w-[170px] shrink-0">
                <span className="font-mono text-[10.5px] uppercase tracking-eyebrow tabular text-bone">
                    <span className={accent.tone}>{accent.label}</span>{" "}
                    <span className="text-bone">#{agent.id}</span>
                </span>
                <span className="font-mono text-[10.5px] tabular text-fg-faint truncate">
                    {shortAddress(agent.owner)}
                </span>
            </div>

            {/* Stat columns */}
            <div className="flex-1 hidden md:grid grid-cols-3 gap-6 items-baseline">
                <Col label="rep" value={agent.reputation.toString()} />
                {isTrader ? (
                    <Col
                        label="win"
                        value={
                            agent.winRate != null
                                ? formatPercent(agent.winRate, {decimals: 0})
                                : "—"
                        }
                        accent="text-mint"
                    />
                ) : isOracle ? (
                    <Col
                        label="maj. align."
                        value={
                            agent.majorityAlignment != null
                                ? formatPercent(agent.majorityAlignment, {decimals: 0})
                                : "—"
                        }
                        accent="text-violet"
                    />
                ) : (
                    <Col label="—" value="—" accent="text-fg-dim" />
                )}
                <Col
                    label="capital"
                    value={
                        agent.capitalDeployed != null && agent.capitalDeployed > 0
                            ? `${formatUsdt0(agent.capitalDeployed, {compact: true})}`
                            : "—"
                    }
                />
            </div>

            {/* Last seen */}
            <div className="hidden md:flex items-center justify-end gap-1.5 shrink-0 w-[100px]">
                {Date.now() - agent.lastActionAt < 5 * 60_000 && (
                    <span
                        className="inline-block w-1.5 h-1.5 rounded-full bg-mint animate-pulse"
                        style={{boxShadow: "0 0 6px rgba(118, 217, 168, 0.75)"}}
                        title="Active in last 5 minutes"
                        aria-label="online"
                    />
                )}
                <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute tabular">
                    {relativeTime(agent.lastActionAt).replace(" ago", "")}
                </span>
            </div>

            <ArrowRight
                size={13}
                weight="regular"
                className="text-fg-faint group-hover:text-amber group-hover:translate-x-0.5 transition-all shrink-0"
            />
        </Link>
    );
}

function Col({label, value, accent}: {label: string; value: string; accent?: string}) {
    return (
        <div className="flex flex-col">
            <span className="font-mono text-[9px] uppercase tracking-eyebrow text-fg-mute">
                {label}
            </span>
            <span
                className={cn(
                    "font-mono text-[12.5px] tabular mt-0.5",
                    accent ?? "text-bone"
                )}
            >
                {value}
            </span>
        </div>
    );
}
