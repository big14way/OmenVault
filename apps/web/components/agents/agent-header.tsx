import Link from "next/link";
import {ArrowLeft, Copy} from "@phosphor-icons/react/dist/ssr";
import {emblemFor} from "@/lib/emblem";
import {reputationHistoryFor} from "@/lib/mock-data";
import {formatDateLong, formatPercent, formatUsdt0, relativeTime, shortAddress} from "@/lib/format";
import type {Agent} from "@/lib/types";
import {ReputationSparkline} from "./reputation-sparkline";
import {cn} from "@/lib/cn";

interface AgentHeaderProps {
    agent: Agent;
    decisionCount: number;
    activePositions: number;
    marketsTouched: number;
}

const TYPE_LABEL: Record<Agent["type"], string> = {
    Trader: "trader",
    OracleNode: "oracle",
    Bettor: "bettor",
};

export function AgentHeader({
    agent,
    decisionCount,
    activePositions,
    marketsTouched,
}: AgentHeaderProps) {
    const history = reputationHistoryFor(agent);
    const repStart = history[0];
    const repNow = history[history.length - 1];
    const repDelta = repNow - repStart;

    return (
        <section className="border-b border-border">
            <div className="max-w-[1440px] mx-auto w-full px-6 md:px-10 pt-6 pb-10">
                {/* Crumb */}
                <div className="mb-8 flex items-center gap-2 font-mono text-[11px] uppercase tracking-eyebrow text-fg-mute">
                    <Link
                        href="/agents/registry"
                        className="inline-flex items-center gap-1.5 hover:text-amber"
                    >
                        <ArrowLeft size={11} weight="regular" />
                        Agents
                    </Link>
                    <span className="text-fg-dim">/</span>
                    <span className="text-bone">
                        {TYPE_LABEL[agent.type]} #{agent.id}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
                    {/* Emblem + identity */}
                    <div className="md:col-span-5">
                        <div className="flex items-start gap-5">
                            <img
                                src={emblemFor(
                                    agent.id,
                                    agent.type === "OracleNode" ? "twilight" : "ink"
                                )}
                                alt=""
                                className="w-24 h-24 md:w-32 md:h-32 border border-border bg-night invert opacity-95 shrink-0"
                            />
                            <div className="flex flex-col gap-2">
                                <p className="font-mono text-[10.5px] uppercase tracking-eyebrow text-amber">
                                    {TYPE_LABEL[agent.type]} · soulbound ERC-8004 #{agent.id}
                                </p>
                                <h1 className="font-display font-extrabold text-display-md text-bone leading-none tabular">
                                    #{agent.id}
                                </h1>
                                <p className="font-mono text-[12px] text-fg-mute tabular mt-1">
                                    owned by{" "}
                                    <button
                                        className="text-bone-soft hover:text-amber underline-draw inline-flex items-center gap-1"
                                        onClick={() => navigator.clipboard?.writeText(agent.owner)}
                                        type="button"
                                    >
                                        {shortAddress(agent.owner)}
                                        <Copy size={10} weight="regular" />
                                    </button>
                                </p>
                                <p className="font-mono text-[11px] text-fg-faint tabular">
                                    registered {formatDateLong(agent.createdAt)} · last seen{" "}
                                    {relativeTime(agent.lastActionAt)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Reputation panel */}
                    <div className="md:col-span-4">
                        <div className="flex items-baseline justify-between mb-2">
                            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                                reputation
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-faint tabular">
                                last {history.length} actions
                            </span>
                        </div>

                        <ReputationSparkline data={history} height={68} />

                        <div className="mt-3 flex items-baseline gap-3 font-mono tabular">
                            <span className="text-fg-faint text-[12px]">{repStart}</span>
                            <span className="text-fg-dim text-[12px]">→</span>
                            <span className="text-bone text-2xl font-display font-bold">
                                {repNow}
                            </span>
                            <span
                                className={cn(
                                    "text-[11px]",
                                    repDelta > 0
                                        ? "text-mint"
                                        : repDelta < 0
                                          ? "text-coral"
                                          : "text-fg-mute"
                                )}
                            >
                                {repDelta > 0 ? "+" : ""}
                                {repDelta}
                            </span>
                        </div>
                    </div>

                    {/* Stats column */}
                    <div className="md:col-span-3">
                        <dl className="flex flex-col gap-3 font-mono tabular border-l border-border-soft pl-5">
                            {agent.type === "Trader" && agent.winRate != null && (
                                <Row
                                    label="win rate"
                                    value={formatPercent(agent.winRate, {decimals: 0})}
                                    accent="text-mint"
                                />
                            )}
                            {agent.type === "OracleNode" &&
                                agent.majorityAlignment != null && (
                                    <Row
                                        label="majority align."
                                        value={formatPercent(agent.majorityAlignment, {
                                            decimals: 0,
                                        })}
                                        accent="text-violet"
                                    />
                                )}
                            {agent.capitalDeployed != null && agent.capitalDeployed > 0 && (
                                <Row
                                    label="deployed"
                                    value={`${formatUsdt0(agent.capitalDeployed, {compact: true})} USDT0`}
                                />
                            )}
                            <Row label="decisions" value={decisionCount.toString()} />
                            <Row label="markets" value={marketsTouched.toString()} />
                            {agent.type !== "OracleNode" && (
                                <Row
                                    label="open positions"
                                    value={activePositions.toString()}
                                />
                            )}
                        </dl>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Row({label, value, accent}: {label: string; value: string; accent?: string}) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[10px] uppercase tracking-eyebrow text-fg-mute">{label}</dt>
            <dd className={cn("text-[14px] font-bold", accent ?? "text-bone")}>{value}</dd>
        </div>
    );
}
