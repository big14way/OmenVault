import Link from "next/link";
import {ArrowRight, Quotes} from "@phosphor-icons/react/dist/ssr";
import {emblemFor} from "@/lib/emblem";
import {formatPercent, formatUsdt0, relativeTime, shortAddress} from "@/lib/format";
import type {Agent, Decision} from "@/lib/types";

interface AgentSpotlightProps {
    agent: Agent;
    lastDecision?: Decision;
    decisionCount: number;
    marketsTouched: number;
}

/**
 * Featured agent on /agents/registry. Pulls the highest-reputation Trader
 * (or whichever lead the page picks) and surfaces their most recent
 * reasoning blob as a pull quote. The roster has a "lead" entry that's
 * editorially singled out — not just another card in a grid.
 */
export function AgentSpotlight({
    agent,
    lastDecision,
    decisionCount,
    marketsTouched,
}: AgentSpotlightProps) {
    const reasoning = lastDecision?.payload.reasoning;
    return (
        <Link
            href={`/agents/${agent.id}`}
            className="group relative block border border-border bg-surface hover:bg-surface-soft transition-colors duration-300 overflow-hidden"
        >
            {/* Top amber rail */}
            <span
                className="absolute top-0 left-0 right-0 h-px bg-amber"
                style={{boxShadow: "0 0 8px rgba(242, 163, 65, 0.5)"}}
            />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 p-6 md:p-8">
                {/* Emblem column */}
                <div className="md:col-span-3 flex md:block items-center gap-4">
                    <img
                        src={emblemFor(agent.id, "ink")}
                        alt=""
                        className="w-20 h-20 md:w-24 md:h-24 border border-border bg-night invert opacity-95 shrink-0"
                    />
                    <div className="md:mt-5">
                        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-amber">
                            {agent.type === "Trader"
                                ? "Trader"
                                : agent.type === "OracleNode"
                                  ? "Oracle"
                                  : "Bettor"}{" "}
                            · spotlight
                        </p>
                        <p className="font-display font-extrabold text-3xl md:text-4xl text-bone mt-1 tabular leading-none">
                            #{agent.id}
                        </p>
                        <p className="font-mono text-[11px] text-fg-mute tabular mt-2">
                            {shortAddress(agent.owner)} · rep {agent.reputation}
                        </p>
                    </div>
                </div>

                {/* Quote + stats column */}
                <div className="md:col-span-9 flex flex-col gap-5">
                    {reasoning ? (
                        <blockquote className="relative border-l-2 border-amber pl-5 py-1">
                            <Quotes
                                size={14}
                                weight="fill"
                                className="absolute -left-2 -top-1 text-amber bg-surface"
                            />
                            <p className="text-[15.5px] leading-relaxed text-bone-soft text-pretty">
                                {reasoning}
                            </p>
                            <footer className="mt-3 font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute tabular">
                                {lastDecision &&
                                    `from ${lastDecision.kind} ${
                                        lastDecision.payload.side ?? ""
                                    } · mkt-${lastDecision.marketId?.padStart(3, "0")} · ${relativeTime(
                                        lastDecision.timestamp
                                    )}`}
                            </footer>
                        </blockquote>
                    ) : (
                        <p className="text-bone-soft italic">
                            No recent reasoning trail on this agent.
                        </p>
                    )}

                    {/* Stats strip */}
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 pt-4 border-t border-border-soft">
                        {agent.type === "Trader" && agent.winRate != null && (
                            <Stat label="Win rate" value={formatPercent(agent.winRate, {decimals: 0})} accent="text-mint" />
                        )}
                        {agent.type === "OracleNode" && agent.majorityAlignment != null && (
                            <Stat
                                label="Majority align."
                                value={formatPercent(agent.majorityAlignment, {decimals: 0})}
                                accent="text-violet"
                            />
                        )}
                        {agent.capitalDeployed != null && (
                            <Stat
                                label="Deployed"
                                value={`${formatUsdt0(agent.capitalDeployed, {compact: true})} USDT0`}
                            />
                        )}
                        <Stat label="Decisions" value={decisionCount.toString()} />
                        <Stat label="Markets" value={marketsTouched.toString()} />
                    </dl>

                    <div className="flex items-center justify-end">
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-eyebrow text-bone-soft group-hover:text-amber transition-colors">
                            Open dossier
                            <ArrowRight
                                size={12}
                                weight="regular"
                                className="group-hover:translate-x-0.5 transition-transform"
                            />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

function Stat({label, value, accent}: {label: string; value: string; accent?: string}) {
    return (
        <div>
            <dt className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute mb-1">
                {label}
            </dt>
            <dd
                className={`font-display font-bold text-xl tabular leading-none ${
                    accent ?? "text-bone"
                }`}
            >
                {value}
            </dd>
        </div>
    );
}
