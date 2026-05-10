import {Coins, Cpu, Stamp} from "@phosphor-icons/react/dist/ssr";

const PILLARS = [
    {
        id: "rwa",
        n: "01",
        title: "Yield-bearing collateral",
        body:
            "Per-market vaults rotate USDT0 into sUSDe (Ethena, ~12% APY) or USDY (Ondo T-bills, ~5%) for the duration of the bet. On resolution, principal + LMSR upside + accrued yield flow to winners.",
        Icon: Coins,
        figure: "12%",
        figureLabel: "APY · sUSDe tier",
        accent: "text-mint",
    },
    {
        id: "agents",
        n: "02",
        title: "Agents that show their work",
        body:
            "Trader agents read Allora forecasts and Nansen smart-money flow, then size positions through claude-haiku-4-5. Every reasoning trail is pinned to IPFS. Every decision is logged on-chain.",
        Icon: Cpu,
        figure: "ERC-8004",
        figureLabel: "Soulbound agent identity",
        accent: "text-amber",
    },
    {
        id: "swarm",
        n: "03",
        title: "A three-of-three oracle",
        body:
            "Three independent ERC-8004 oracle agents post signed verdicts using different data sources. Majority wins; 1-1-1 disagreement reverts and re-votes. Reputation lives on-chain.",
        Icon: Stamp,
        figure: "3/3",
        figureLabel: "Independent verdicts",
        accent: "text-violet",
    },
];

export function Pillars() {
    return (
        <section className="relative py-24 md:py-32">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10">
                <div className="max-w-2xl mb-16 md:mb-20">
                    <h2 className="font-display font-extrabold text-display-lg text-bone text-balance">
                        Three things no other prediction market on{" "}
                        <span className="text-amber">any chain</span> can show.
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
                    {PILLARS.map((p) => (
                        <article
                            key={p.id}
                            className="bg-night p-8 md:p-10 group hover:bg-surface transition-colors duration-500 relative"
                        >
                            {/* Hover ember on top edge */}
                            <span className="absolute top-0 left-0 right-0 h-px bg-amber scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-700 ease-editorial" />

                            <div className="flex items-start justify-between mb-8">
                                <span className={`font-mono text-2xl tabular ${p.accent}`}>
                                    {p.n}
                                </span>
                                <p.Icon
                                    size={26}
                                    weight="regular"
                                    className="text-fg-mute group-hover:text-amber transition-colors duration-500"
                                />
                            </div>

                            <h3 className="font-display font-bold text-display-md text-bone mb-4 leading-[1.1]">
                                {p.title}
                            </h3>
                            <p className="text-bone-soft leading-relaxed text-[15px] mb-8">
                                {p.body}
                            </p>

                            <div className="pt-6 border-t border-border">
                                <p
                                    className={`font-display font-extrabold text-4xl tabular leading-none ${p.accent}`}
                                >
                                    {p.figure}
                                </p>
                                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute mt-2">
                                    {p.figureLabel}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
