import Link from "next/link";
import {ArrowRight} from "@phosphor-icons/react/dist/ssr";
import {MarketCard} from "@/components/markets/market-card";
import {MOCK_MARKETS} from "@/lib/mock-data";

export function FeaturedMarkets() {
    const featured = MOCK_MARKETS.filter((m) => m.status === "active").slice(0, 3);

    return (
        <section className="relative py-24 md:py-32 bg-night-deep border-y border-border">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                <div className="flex items-end justify-between gap-6 mb-12 md:mb-16 flex-wrap">
                    <div className="max-w-2xl">
                        <h2 className="font-display font-extrabold text-display-lg text-bone text-balance">
                            Markets <span className="text-amber">live</span> right now.
                        </h2>
                        <p className="mt-5 text-bone-soft leading-relaxed max-w-prose text-pretty">
                            Each market routes its collateral into the tier the creator picked.
                            Yield accrues silently. Bets settle in USDT0.
                        </p>
                    </div>
                    <Link
                        href="/markets"
                        className="inline-flex items-center gap-2 font-mono uppercase tracking-eyebrow text-[11px] text-bone hover:text-amber underline-draw"
                    >
                        View all markets
                        <ArrowRight size={12} weight="regular" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featured.map((m) => (
                        <MarketCard key={m.id} market={m} />
                    ))}
                </div>
            </div>
        </section>
    );
}
