"use client";

import Link from "next/link";
import {useMemo, useState} from "react";
import {Plus} from "@phosphor-icons/react/dist/ssr";
import {Button} from "@/components/primitives/button";
import {MarketCard} from "@/components/markets/market-card";
import {
    MarketsFilterBar,
    type MarketFilters,
} from "@/components/markets/markets-filter-bar";
import {MarketsLiveRail} from "@/components/markets/markets-live-rail";
import {MOCK_MARKETS} from "@/lib/mock-data";
import {useMarkets} from "@/lib/web3/hooks/use-markets";
import {deployment} from "@/lib/web3/config";

export default function MarketsListPage() {
    const [filters, setFilters] = useState<MarketFilters>({
        status: "active",
        tier: "all",
        sort: "volume",
        search: "",
    });

    // When the factory address is configured we trust the chain as the only source
    // of truth — even while loading or when zero markets exist. Falling back to mocks
    // here led users into entering positions on non-deployed addresses.
    // Mocks are only used in pre-deploy frontend work when no factory is configured.
    const {data: onChainMarkets, isLoading} = useMarkets();
    const factoryConfigured = Boolean(deployment.marketFactory);
    const markets = factoryConfigured ? (onChainMarkets ?? []) : MOCK_MARKETS;

    const counts = useMemo(
        () => ({
            all: markets.length,
            active: markets.filter((m) => m.status === "active").length,
            resolving: markets.filter((m) => m.status === "resolving").length,
            resolved: markets.filter((m) => m.status === "resolved").length,
        }),
        [markets]
    );

    const filtered = useMemo(() => {
        let xs = markets.slice();
        if (filters.status !== "all") xs = xs.filter((m) => m.status === filters.status);
        if (filters.tier !== "all") xs = xs.filter((m) => m.tier === filters.tier);
        if (filters.search.trim()) {
            const s = filters.search.toLowerCase();
            xs = xs.filter((m) => m.question.toLowerCase().includes(s) || m.id.includes(s));
        }
        switch (filters.sort) {
            case "volume":
                xs.sort((a, b) => b.volumeUsdt0 - a.volumeUsdt0);
                break;
            case "yield":
                xs.sort((a, b) => b.yieldEarned - a.yieldEarned);
                break;
            case "deadline":
                xs.sort((a, b) => a.resolutionAt - b.resolutionAt);
                break;
            case "ai":
                xs.sort((a, b) => b.aiTradersActive - a.aiTradersActive);
                break;
        }
        return xs;
    }, [filters, markets]);

    return (
        <main className="relative pb-32">
            {/* Page header */}
            <section className="border-b border-border">
                <div className="max-w-[1440px] mx-auto px-6 md:px-10 pt-14 pb-10">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                        <div>
                            <h1 className="font-display font-extrabold text-display-lg text-bone leading-[1.02] text-balance">
                                Open markets,{" "}
                                <span className="text-amber">live agents.</span>
                            </h1>
                            <p className="mt-5 text-bone-soft max-w-prose text-pretty">
                                Filter by status, collateral tier, or AI activity. Click any market
                                to enter, watch agents, or claim a settled position.
                            </p>
                        </div>

                        <div className="shrink-0">
                            <Button asChild size="md" variant="outline">
                                <Link href="/markets/new">
                                    <Plus size={12} weight="regular" />
                                    New market
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Body — grid of cards + sticky live rail */}
            <section className="max-w-[1440px] mx-auto px-6 md:px-10 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Cards column */}
                    <div className="lg:col-span-8 xl:col-span-9">
                        <MarketsFilterBar value={filters} onChange={setFilters} counts={counts} />

                        <div className="mt-6 mb-6 flex items-center justify-between">
                            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute tabular">
                                {filtered.length} {filtered.length === 1 ? "market" : "markets"}
                            </p>
                        </div>

                        {factoryConfigured && isLoading && markets.length === 0 ? (
                            <div className="border border-border bg-surface p-16 text-center">
                                <p className="font-mono text-[12px] text-fg-mute uppercase tracking-eyebrow">
                                    Loading markets from chain…
                                </p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <EmptyState
                                onReset={() =>
                                    setFilters({...filters, search: "", tier: "all"})
                                }
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {filtered.map((m) => (
                                    <MarketCard key={m.id} market={m} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Live rail */}
                    <div className="lg:col-span-4 xl:col-span-3">
                        <div className="lg:sticky lg:top-24">
                            <MarketsLiveRail />
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

function EmptyState({onReset}: {onReset: () => void}) {
    return (
        <div className="border border-border bg-surface p-16 text-center">
            <p className="font-display font-bold text-3xl text-bone-soft mb-2">
                No markets match.
            </p>
            <p className="text-sm text-fg-mute mb-6 max-w-md mx-auto">
                Either nothing fits these filters yet, or the search came back empty. Loosen the
                filters or be the first to create one.
            </p>
            <div className="flex items-center justify-center gap-3">
                <Button variant="dim" size="md" onClick={onReset}>
                    Reset filters
                </Button>
                <Button asChild size="md" variant="primary">
                    <Link href="/markets/new">Create market</Link>
                </Button>
            </div>
        </div>
    );
}
