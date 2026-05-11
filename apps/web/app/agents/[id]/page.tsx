"use client";

import Link from "next/link";
import {notFound, useParams} from "next/navigation";
import {useMemo} from "react";
import {ArrowRight} from "@phosphor-icons/react/dist/ssr";
import {AgentHeader} from "@/components/agents/agent-header";
import {AgentDecisionRow} from "@/components/agents/agent-decision-row";
import {findAgent, MOCK_DECISIONS, MOCK_MARKETS} from "@/lib/mock-data";
import {formatUsdt0} from "@/lib/format";
import {cn} from "@/lib/cn";
import type {Decision, Market} from "@/lib/types";
import {useAgents} from "@/lib/web3/hooks/use-agents";

function decisionsFor(agentId: number): Decision[] {
    return MOCK_DECISIONS.filter((d) => d.agentId === agentId).sort(
        (a, b) => b.timestamp - a.timestamp
    );
}

export default function AgentProfilePage() {
    const params = useParams<{id: string}>();
    const agentId = parseInt(params.id, 10);
    const {data: onChainAgents} = useAgents();
    const agent =
        onChainAgents?.find((a) => a.id === agentId) ?? findAgent(agentId);

    if (!agent || isNaN(agentId)) {
        notFound();
    }

    const decisions = useMemo(() => decisionsFor(agentId), [agentId]);

    const marketsTouched = useMemo(
        () => Array.from(new Set(decisions.map((d) => d.marketId).filter(Boolean))) as string[],
        [decisions]
    );

    // For Traders/Bettors, "active positions" ≈ recent ENTER decisions on
    // unresolved markets that haven't been followed by a CLAIM by this agent.
    const activePositions = useMemo(() => {
        if (agent.type === "OracleNode") return [];
        const claimedMarkets = new Set(
            decisions.filter((d) => d.kind === "CLAIM").map((d) => d.marketId)
        );
        const enters = decisions.filter((d) => d.kind === "ENTER" && !claimedMarkets.has(d.marketId));
        // Deduplicate per market — keep the most recent
        const byMarket = new Map<string, Decision>();
        enters.forEach((d) => {
            if (d.marketId && !byMarket.has(d.marketId)) byMarket.set(d.marketId, d);
        });
        return Array.from(byMarket.values());
    }, [decisions, agent.type]);

    return (
        <main className="relative flex-1 flex flex-col pb-24">
            <AgentHeader
                agent={agent}
                decisionCount={decisions.length}
                activePositions={activePositions.length}
                marketsTouched={marketsTouched.length}
            />

            <div className="max-w-[1440px] mx-auto w-full px-6 md:px-10 pt-12 flex-1 flex flex-col gap-14">
                {/* Operator cross-link — only on Oracle agents */}
                {agent.type === "OracleNode" && (
                    <Link
                        href={`/oracle/${agent.id}`}
                        className="inline-flex items-center justify-between gap-4 border border-violet/40 bg-violet/[0.06] hover:bg-violet/[0.12] px-5 py-4 transition-colors group"
                    >
                        <div className="flex flex-col">
                            <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-violet">
                                Operator-only · authenticated route
                            </span>
                            <span className="font-display font-bold text-[16px] text-bone mt-0.5 group-hover:text-violet transition-colors">
                                Open operator dashboard
                            </span>
                        </div>
                        <ArrowRight
                            size={14}
                            weight="regular"
                            className="text-violet group-hover:translate-x-0.5 transition-transform"
                        />
                    </Link>
                )}

                {/* Recent decisions */}
                <section>
                    <header className="flex items-baseline justify-between mb-4">
                        <h2 className="font-display font-bold text-2xl text-bone">
                            Recent {agent.type === "OracleNode" ? "votes" : "decisions"}
                        </h2>
                        <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute tabular">
                            {decisions.length} total
                        </span>
                    </header>

                    {decisions.length === 0 ? (
                        <EmptyState label={`no ${agent.type === "OracleNode" ? "votes" : "decisions"} recorded yet`} />
                    ) : (
                        <div className="border border-border bg-night">
                            {decisions.slice(0, 20).map((d) => (
                                <AgentDecisionRow key={d.id} decision={d} />
                            ))}
                            {decisions.length > 20 && (
                                <Link
                                    href={`/audit?type=${
                                        agent.type === "Trader"
                                            ? "trader"
                                            : agent.type === "OracleNode"
                                              ? "oracle"
                                              : "bettor"
                                    }`}
                                    className="block px-4 md:px-6 py-3 bg-surface-soft hover:bg-surface text-center font-mono text-[11px] uppercase tracking-eyebrow text-bone-soft hover:text-amber transition-colors"
                                >
                                    View all in audit ledger ↗
                                </Link>
                            )}
                        </div>
                    )}
                </section>

                {/* Active positions — Traders + Bettors */}
                {agent.type !== "OracleNode" && (
                    <section>
                        <header className="flex items-baseline justify-between mb-4">
                            <h2 className="font-display font-bold text-2xl text-bone">
                                Active positions
                            </h2>
                            <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute tabular">
                                {activePositions.length} open
                            </span>
                        </header>
                        {activePositions.length === 0 ? (
                            <EmptyState label="no open positions" />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
                                {activePositions.map((d) => {
                                    const market = MOCK_MARKETS.find((m) => m.id === d.marketId);
                                    if (!market) return null;
                                    return (
                                        <PositionMini key={d.id} decision={d} market={market} />
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                {/* Voting record — Oracles */}
                {agent.type === "OracleNode" && (
                    <section>
                        <header className="flex items-baseline justify-between mb-4">
                            <h2 className="font-display font-bold text-2xl text-bone">
                                Markets resolved
                            </h2>
                            <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute tabular">
                                {marketsTouched.length} touched
                            </span>
                        </header>
                        {marketsTouched.length === 0 ? (
                            <EmptyState label="no resolutions recorded" />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
                                {marketsTouched.map((mid) => {
                                    const market = MOCK_MARKETS.find((m) => m.id === mid);
                                    if (!market) return null;
                                    const vote = decisions.find(
                                        (d) => d.kind === "VOTE" && d.marketId === mid
                                    );
                                    return (
                                        <OracleMini
                                            key={mid}
                                            market={market}
                                            outcome={vote?.payload.outcome}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}

function PositionMini({decision, market}: {decision: Decision; market: Market}) {
    const side = decision.payload.side ?? "YES";
    return (
        <Link
            href={`/markets/${market.id}`}
            className="group block bg-night p-5 hover:bg-surface transition-colors"
        >
            <div className="flex items-center justify-between mb-2 font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute tabular">
                <span>mkt-{market.id.padStart(3, "0")}</span>
                <span className={side === "YES" ? "text-mint" : "text-coral"}>{side}</span>
            </div>
            <h3 className="font-display font-bold text-[16px] leading-snug text-bone mb-3 group-hover:text-amber transition-colors min-h-[2.6em]">
                {market.question}
            </h3>
            <dl className="flex items-baseline justify-between font-mono text-[11px] tabular">
                <div>
                    <dt className="text-fg-mute uppercase tracking-eyebrow text-[9px]">stake</dt>
                    <dd className="text-bone mt-0.5">
                        {decision.payload.amount != null
                            ? formatUsdt0(decision.payload.amount, {compact: true})
                            : "—"}
                    </dd>
                </div>
                <div className="text-right">
                    <dt className="text-fg-mute uppercase tracking-eyebrow text-[9px]">entered</dt>
                    <dd className="text-bone mt-0.5">
                        @ {decision.payload.price?.toFixed(2) ?? "—"}
                    </dd>
                </div>
                <ArrowRight
                    size={12}
                    weight="regular"
                    className="text-fg-faint group-hover:text-amber group-hover:translate-x-0.5 transition-all"
                />
            </dl>
        </Link>
    );
}

function OracleMini({market, outcome}: {market: Market; outcome?: "YES" | "NO" | "INVALID"}) {
    return (
        <Link
            href={`/markets/${market.id}`}
            className="group block bg-night p-5 hover:bg-surface transition-colors"
        >
            <div className="flex items-center justify-between mb-2 font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute tabular">
                <span>mkt-{market.id.padStart(3, "0")}</span>
                {outcome && (
                    <span
                        className={cn(
                            outcome === "YES"
                                ? "text-mint"
                                : outcome === "NO"
                                  ? "text-coral"
                                  : "text-fg-mute"
                        )}
                    >
                        VOTED {outcome}
                    </span>
                )}
            </div>
            <h3 className="font-display font-bold text-[16px] leading-snug text-bone mb-2 group-hover:text-amber transition-colors min-h-[2.6em]">
                {market.question}
            </h3>
            <p className="font-mono text-[11px] text-fg-mute tabular">
                resolved · {market.tier} tier
            </p>
        </Link>
    );
}

function EmptyState({label}: {label: string}) {
    return (
        <div className="border border-border bg-night-deep px-6 py-12 font-mono text-[12px] text-fg-mute">
            {label}
            <span className="term-cursor ml-1" />
        </div>
    );
}
