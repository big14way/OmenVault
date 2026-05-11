"use client";

import {notFound, useParams} from "next/navigation";
import {useMemo} from "react";
import {OracleHeader} from "@/components/oracle/oracle-header";
import {VerdictCase} from "@/components/oracle/verdict-case";
import {VotingHistoryRow} from "@/components/oracle/voting-history-row";
import {findAgent, MOCK_DECISIONS, MOCK_MARKETS} from "@/lib/mock-data";
import type {Decision, Outcome} from "@/lib/types";

function votesByMarket(): Record<string, Decision[]> {
    const out: Record<string, Decision[]> = {};
    MOCK_DECISIONS.forEach((d) => {
        if (d.kind === "VOTE" && d.marketId) {
            (out[d.marketId] ??= []).push(d);
        }
    });
    return out;
}

function majorityOutcomeFor(votes: Decision[]): Outcome | undefined {
    const counts: Record<Outcome, number> = {YES: 0, NO: 0, INVALID: 0};
    votes.forEach((v) => {
        const o = v.payload.outcome as Outcome | undefined;
        if (o) counts[o] += 1;
    });
    const sorted = (Object.entries(counts) as [Outcome, number][])
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return undefined;
    if (sorted.length >= 2 && sorted[0][1] === sorted[1][1]) return undefined;
    return sorted[0][0];
}

export default function OracleDashboardPage() {
    const params = useParams<{id: string}>();
    const oracleId = parseInt(params.id, 10);
    const agent = findAgent(oracleId);

    if (!agent || agent.type !== "OracleNode" || isNaN(oracleId)) {
        notFound();
    }

    const byMarket = useMemo(() => votesByMarket(), []);

    // Pending verdicts: resolving markets where this oracle hasn't voted yet.
    const pending = useMemo(() => {
        return MOCK_MARKETS.filter((m) => m.status === "resolving").filter((m) => {
            const votes = byMarket[m.id] ?? [];
            return !votes.some((v) => v.agentId === oracleId);
        });
    }, [oracleId, byMarket]);

    // Voting history: this oracle's VOTE decisions, newest first.
    const history = useMemo(() => {
        return MOCK_DECISIONS.filter((d) => d.kind === "VOTE" && d.agentId === oracleId).sort(
            (a, b) => b.timestamp - a.timestamp
        );
    }, [oracleId]);

    return (
        <main className="relative flex-1 flex flex-col pb-24">
            <OracleHeader agent={agent} pendingCount={pending.length} />

            <div className="max-w-[1440px] mx-auto w-full px-6 md:px-10 flex-1 flex flex-col gap-16 pt-12">
                {/* Pending verdicts — case docket */}
                <section>
                    <header className="flex items-baseline justify-between mb-2">
                        <h2 className="font-display font-bold text-2xl text-bone">
                            Pending verdicts
                        </h2>
                        <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute tabular">
                            {pending.length} {pending.length === 1 ? "case" : "cases"} awaiting signature
                        </span>
                    </header>
                    <p className="font-mono text-[11px] text-fg-faint mb-2 max-w-prose leading-relaxed">
                        Each market below has reached its resolution timestamp and your verdict is
                        outstanding. Sources are read at the resolution moment; suggested verdict
                        reflects what your data shows. You can override before signing.
                    </p>

                    {pending.length === 0 ? (
                        <EmptyDocket />
                    ) : (
                        <div className="border border-border-soft bg-night-deep px-6 md:px-8 pb-6">
                            {pending.map((market, i) => (
                                <VerdictCase
                                    key={market.id}
                                    market={market}
                                    oracleId={oracleId}
                                    index={i + 1}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Voting history */}
                <section>
                    <header className="flex items-baseline justify-between mb-4">
                        <h2 className="font-display font-bold text-2xl text-bone">
                            Voting history
                        </h2>
                        <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute tabular">
                            {history.length} {history.length === 1 ? "vote" : "votes"} cast
                        </span>
                    </header>

                    {history.length === 0 ? (
                        <div className="border border-border bg-night-deep px-6 py-12 font-mono text-[12px] text-fg-mute">
                            no votes cast yet
                            <span className="term-cursor ml-1" />
                        </div>
                    ) : (
                        <div className="border border-border bg-night">
                            {history.map((d) => (
                                <VotingHistoryRow
                                    key={d.id}
                                    decision={d}
                                    majorityOutcome={
                                        d.marketId
                                            ? majorityOutcomeFor(byMarket[d.marketId] ?? [])
                                            : undefined
                                    }
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

function EmptyDocket() {
    return (
        <div className="border border-border bg-night-deep px-6 py-12">
            <p className="font-mono text-[13px] text-fg-mute">
                $ omenvault oracle --pending
                <br />
                <span className="text-bone-soft">docket clear · no markets awaiting your signature</span>
                <span className="term-cursor ml-1" />
            </p>
            <p className="mt-3 font-mono text-[11px] text-fg-faint">
                you&apos;ll be paged when a market hits resolution
            </p>
        </div>
    );
}
