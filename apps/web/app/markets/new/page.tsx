"use client";

import Link from "next/link";
import {useState} from "react";
import {ArrowLeft} from "@phosphor-icons/react/dist/ssr";
import {MarketCard} from "@/components/markets/market-card";
import {
    buildDraftMarket,
    NewMarketForm,
    type DraftState,
} from "@/components/markets/new-market-form";

const INITIAL: DraftState = (() => {
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
    inTwoWeeks.setHours(23, 59, 0, 0);
    return {
        template: "crypto",
        underlying: "ETH",
        direction: "above",
        threshold: 4500,
        customQuestion: "",
        resolutionAt: inTwoWeeks.getTime(),
        tier: "sUSDe",
        minStakeUsdt0: 25,
        liquidityB: 1000,
        alloraTopicId: "14",
    };
})();

export default function NewMarketPage() {
    const [state, setState] = useState<DraftState>(INITIAL);
    const draft = buildDraftMarket(state);

    return (
        <main className="relative flex-1 flex flex-col pb-24">
            {/* Header */}
            <section className="border-b border-border">
                <div className="max-w-[1440px] mx-auto w-full px-6 md:px-10 pt-6 pb-10">
                    {/* Crumb */}
                    <div className="mb-7 flex items-center gap-2 font-mono text-[11px] uppercase tracking-eyebrow text-fg-mute">
                        <Link
                            href="/markets"
                            className="inline-flex items-center gap-1.5 hover:text-amber"
                        >
                            <ArrowLeft size={11} weight="regular" />
                            Markets
                        </Link>
                        <span className="text-fg-dim">/</span>
                        <span className="text-bone">new</span>
                    </div>

                    <h1 className="font-display font-extrabold text-display-lg text-bone leading-[1.02] text-balance">
                        Issue a market.
                    </h1>
                    <p className="mt-4 font-mono text-[13px] text-fg-mute tabular max-w-prose">
                        Define the question, the resolution date, and the collateral tier.
                        Permissionless · pre-audit · Mantle Sepolia.
                    </p>
                </div>
            </section>

            {/* Body — form + sticky preview */}
            <section className="max-w-[1440px] mx-auto w-full px-6 md:px-10 pt-10 flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                    {/* Form */}
                    <div className="lg:col-span-7">
                        <NewMarketForm state={state} onChange={setState} />
                    </div>

                    {/* Sticky preview */}
                    <aside className="lg:col-span-5">
                        <div className="lg:sticky lg:top-24 flex flex-col gap-3">
                            <div className="flex items-baseline justify-between">
                                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">
                                    Preview
                                </p>
                                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-faint tabular">
                                    live · updates as you fill
                                </p>
                            </div>

                            <MarketCard market={draft} />

                            <p className="font-mono text-[10.5px] text-fg-faint tabular leading-relaxed mt-2">
                                This is how the market will appear on /markets and in feeds.
                                Yield ribbon animates from 0%; live activity chip will appear once
                                an agent or bettor enters.
                            </p>
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}
