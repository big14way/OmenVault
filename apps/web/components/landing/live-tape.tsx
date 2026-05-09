"use client";

import {ArrowRight, CircleNotch, Robot, Stamp, User} from "@phosphor-icons/react/dist/ssr";
import {MOCK_DECISIONS} from "@/lib/mock-data";
import {relativeTime} from "@/lib/format";

const ICONS = {
    ENTER: Robot,
    EXIT: ArrowRight,
    VOTE: Stamp,
    FINALIZE: Stamp,
    CLAIM: ArrowRight,
    CREATE_MARKET: ArrowRight,
    REASONING: CircleNotch,
} as const;

const COLOR = {
    ENTER: "text-amber",
    EXIT: "text-fg-mute",
    VOTE: "text-violet",
    FINALIZE: "text-bone",
    CLAIM: "text-mint",
    CREATE_MARKET: "text-fg-mute",
    REASONING: "text-amber",
} as const;

function Item({decision}: {decision: (typeof MOCK_DECISIONS)[number]}) {
    const Icon = decision.agentType === "Bettor" ? User : ICONS[decision.kind];
    const color = COLOR[decision.kind];
    const label = (() => {
        switch (decision.kind) {
            case "ENTER":
                if (decision.agentType === "Trader") {
                    return (
                        <>
                            <span className="text-amber">TRADER#{decision.agentId}</span> enter{" "}
                            <span className={decision.payload.side === "YES" ? "text-mint" : "text-coral"}>
                                {decision.payload.side}
                            </span>{" "}
                            on MKT-{(decision.marketId ?? "0").padStart(3, "0")}
                        </>
                    );
                }
                return (
                    <>
                        BETTOR enter{" "}
                        <span className={decision.payload.side === "YES" ? "text-mint" : "text-coral"}>
                            {decision.payload.side}
                        </span>{" "}
                        on MKT-{(decision.marketId ?? "0").padStart(3, "0")}
                    </>
                );
            case "VOTE":
                return (
                    <>
                        <span className="text-violet">ORACLE#{decision.agentId}</span> vote{" "}
                        <span
                            className={
                                decision.payload.outcome === "YES"
                                    ? "text-mint"
                                    : decision.payload.outcome === "NO"
                                      ? "text-coral"
                                      : "text-fg-mute"
                            }
                        >
                            {decision.payload.outcome}
                        </span>{" "}
                        on MKT-{(decision.marketId ?? "0").padStart(3, "0")}
                    </>
                );
            case "FINALIZE":
                return (
                    <>
                        MKT-{(decision.marketId ?? "0").padStart(3, "0")} FINAL{" "}
                        <span
                            className={
                                decision.payload.outcome === "YES"
                                    ? "text-mint"
                                    : decision.payload.outcome === "NO"
                                      ? "text-coral"
                                      : "text-fg-mute"
                            }
                        >
                            {decision.payload.outcome}
                        </span>
                    </>
                );
            case "CLAIM":
                return <>BETTOR claim payout MKT-{(decision.marketId ?? "0").padStart(3, "0")}</>;
            case "CREATE_MARKET":
                return <>NEW MARKET MKT-{(decision.marketId ?? "0").padStart(3, "0")}</>;
            default:
                return (
                    <>
                        {decision.kind} MKT-{(decision.marketId ?? "0").padStart(3, "0")}
                    </>
                );
        }
    })();

    return (
        <span className="inline-flex items-center gap-3 px-6 py-3 border-r border-border whitespace-nowrap">
            <Icon size={11} weight="regular" className={`${color} shrink-0`} />
            <span className="font-mono text-[11.5px] text-bone-soft uppercase tracking-wide">
                {label}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-faint tabular">
                {relativeTime(decision.timestamp)}
            </span>
        </span>
    );
}

export function LiveTape() {
    const items = [...MOCK_DECISIONS, ...MOCK_DECISIONS];

    return (
        <section
            aria-label="Live activity"
            className="relative border-y border-border bg-night-deep overflow-hidden"
        >
            {/* Edge fades */}
            <div className="absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-night-deep to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-night-deep to-transparent pointer-events-none" />

            {/* Leading label */}
            <div className="absolute top-1/2 left-6 -translate-y-1/2 z-20 flex items-center gap-2 pr-4 bg-night-deep">
                <span className="ember-dot" />
                <span className="font-mono text-[10px] uppercase tracking-eyebrow text-amber">
                    LIVE
                </span>
            </div>

            <div className="flex items-stretch w-max animate-marquee pl-32">
                {items.map((d, i) => (
                    <Item key={`${d.id}-${i}`} decision={d} />
                ))}
            </div>
        </section>
    );
}
