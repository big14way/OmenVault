"use client";

import {useMemo, useState} from "react";
import {AgentSpotlight} from "@/components/agents/agent-spotlight";
import {AgentRosterRow} from "@/components/agents/agent-roster-row";
import {
    AgentRosterFilters,
    type RosterSort,
    type RosterType,
} from "@/components/agents/agent-roster-filters";
import {MOCK_AGENTS, MOCK_DECISIONS} from "@/lib/mock-data";
import type {Agent} from "@/lib/types";
import {useAgents} from "@/lib/web3/hooks/use-agents";
import {deployment} from "@/lib/web3/config";

const TYPE_MATCH: Record<RosterType, (a: Agent) => boolean> = {
    all: () => true,
    trader: (a) => a.type === "Trader",
    oracle: (a) => a.type === "OracleNode",
    bettor: (a) => a.type === "Bettor",
};

const SORTERS: Record<RosterSort, (a: Agent, b: Agent) => number> = {
    rep: (a, b) => b.reputation - a.reputation,
    win: (a, b) => (b.winRate ?? -1) - (a.winRate ?? -1),
    capital: (a, b) => (b.capitalDeployed ?? 0) - (a.capitalDeployed ?? 0),
    recent: (a, b) => b.lastActionAt - a.lastActionAt,
};

function decisionsFor(agentId: number) {
    return MOCK_DECISIONS.filter((d) => d.agentId === agentId).sort(
        (a, b) => b.timestamp - a.timestamp
    );
}

export default function AgentsRegistryPage() {
    const [type, setType] = useState<RosterType>("all");
    const [sort, setSort] = useState<RosterSort>("rep");

    const {data: onChainAgents} = useAgents();
    const usingChain = Boolean(deployment.agentRegistry) && (onChainAgents?.length ?? 0) > 0;
    const agents = usingChain ? onChainAgents! : MOCK_AGENTS;

    const counts: Record<RosterType, number> = useMemo(
        () => ({
            all: agents.length,
            trader: agents.filter((a) => a.type === "Trader").length,
            oracle: agents.filter((a) => a.type === "OracleNode").length,
            bettor: agents.filter((a) => a.type === "Bettor").length,
        }),
        [agents]
    );

    // Spotlight = highest-reputation Trader (the most likely demo focus)
    const spotlight = useMemo(() => {
        return agents.filter((a) => a.type === "Trader").sort(
            (a, b) => b.reputation - a.reputation
        )[0];
    }, [agents]);

    const spotlightDecisions = useMemo(
        () => (spotlight ? decisionsFor(spotlight.id) : []),
        [spotlight]
    );

    const spotlightLast = spotlightDecisions.find(
        (d) => d.kind === "ENTER" && d.payload.reasoning
    );

    const spotlightMarkets = useMemo(
        () => new Set(spotlightDecisions.map((d) => d.marketId).filter(Boolean)).size,
        [spotlightDecisions]
    );

    const roster = useMemo(() => {
        const xs = agents.filter(TYPE_MATCH[type])
            // Exclude the spotlight when "all" or "trader" is selected — already shown above
            .filter((a) => !(spotlight && a.id === spotlight.id && (type === "all" || type === "trader")));
        xs.sort(SORTERS[sort]);
        return xs;
    }, [agents, type, sort, spotlight]);

    const activeNow = useMemo(
        () => agents.filter((a) => Date.now() - a.lastActionAt < 30 * 60_000).length,
        [agents]
    );

    return (
        <main className="relative flex-1 flex flex-col pb-24">
            {/* Header */}
            <section className="border-b border-border">
                <div className="max-w-[1440px] mx-auto px-6 md:px-10 pt-14 pb-10">
                    <h1 className="font-display font-extrabold text-display-lg text-bone leading-[1.02] text-balance">
                        Agents
                    </h1>
                    <p className="mt-4 font-mono text-[13px] text-fg-mute tabular">
                        <span className="text-bone">{agents.length}</span> registered ·{" "}
                        <span className="text-amber">{activeNow}</span> active in last 30m · ERC-8004
                        soulbound
                    </p>
                </div>
            </section>

            <section className="max-w-[1440px] mx-auto w-full px-6 md:px-10 pt-8 flex-1 flex flex-col gap-8">
                {/* Spotlight */}
                {spotlight && (
                    <AgentSpotlight
                        agent={spotlight}
                        lastDecision={spotlightLast}
                        decisionCount={spotlightDecisions.length}
                        marketsTouched={spotlightMarkets}
                    />
                )}

                {/* Filters */}
                <div className="pt-2">
                    <AgentRosterFilters
                        type={type}
                        sort={sort}
                        onTypeChange={setType}
                        onSortChange={setSort}
                        counts={counts}
                    />
                </div>

                {/* Roster list */}
                <div className="flex-1 flex flex-col">
                    <div className="mb-3 font-mono text-[11px] uppercase tracking-eyebrow text-fg-mute tabular">
                        <span className="text-bone">{roster.length}</span>{" "}
                        {roster.length === 1 ? "agent" : "agents"}
                    </div>

                    {roster.length === 0 ? (
                        <EmptyRoster />
                    ) : (
                        <div className="border border-border bg-night flex-1 flex flex-col">
                            {roster.map((agent) => (
                                <AgentRosterRow key={agent.id} agent={agent} />
                            ))}
                            {/* Ruled-paper filler so the frame extends */}
                            <div
                                className="flex-1 min-h-[80px]"
                                style={{
                                    backgroundImage:
                                        "repeating-linear-gradient(0deg, transparent 0 55px, rgba(232, 229, 221, 0.025) 55px 56px)",
                                }}
                                aria-hidden
                            />
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}

function EmptyRoster() {
    return (
        <div className="border border-border bg-night-deep px-6 py-16">
            <p className="font-mono text-[13px] text-fg-mute">
                $ omenvault agents
                <br />
                <span className="text-bone-soft">no agents match this filter</span>
                <span className="term-cursor ml-1" />
            </p>
        </div>
    );
}
