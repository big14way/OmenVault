"use client";

import Link from "next/link";
import {Drawer} from "vaul";
import {ArrowSquareOut, Robot, Stamp, User, X} from "@phosphor-icons/react/dist/ssr";
import {emblemFor} from "@/lib/emblem";
import {findAgent, findMarket} from "@/lib/mock-data";
import {formatUsdt0, shortAddress} from "@/lib/format";
import {cn} from "@/lib/cn";
import type {Decision} from "@/lib/types";

function formatTimestampFull(ms: number): string {
    const d = new Date(ms);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function blockNumberFor(decision: Decision): number {
    const baseBlock = 3_827_401;
    const minutesAgo = Math.floor((Date.now() - decision.timestamp) / 60_000);
    return baseBlock - Math.floor(minutesAgo * 30);
}

interface LedgerDrawerProps {
    decision: Decision | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Right-slide drawer with asymmetric layout:
 *   left spine (~52px) — timestamp set rotated 90°, like a print ledger margin
 *   right body — header path + key/value payload + IPFS blob + tx info
 */
export function LedgerDrawer({decision, open, onOpenChange}: LedgerDrawerProps) {
    return (
        <Drawer.Root
            direction="right"
            open={open}
            onOpenChange={onOpenChange}
            handleOnly
        >
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-50 bg-night-deep/70 backdrop-blur-sm data-[state=open]:animate-fade-up" />
                <Drawer.Content className="fixed top-0 right-0 z-50 h-full w-full sm:w-[560px] bg-night border-l border-border outline-none flex">
                    <Drawer.Title className="sr-only">
                        Decision detail
                    </Drawer.Title>
                    {decision && <DrawerBody decision={decision} onClose={() => onOpenChange(false)} />}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

function DrawerBody({decision, onClose}: {decision: Decision; onClose: () => void}) {
    const agent = findAgent(decision.agentId);
    const market = decision.marketId ? findMarket(decision.marketId) : undefined;
    const block = blockNumberFor(decision);
    const timestamp = formatTimestampFull(decision.timestamp);

    return (
        <>
            {/* Left spine — vertical timestamp + close handle */}
            <aside className="w-12 sm:w-14 shrink-0 border-r border-border-soft bg-night-deep flex flex-col items-center justify-between py-4">
                <button
                    onClick={onClose}
                    className="text-fg-mute hover:text-amber transition-colors"
                    aria-label="Close"
                >
                    <X size={14} weight="regular" />
                </button>

                {/* Rotated timestamp running vertically — print-ledger margin feel */}
                <div
                    className="font-mono text-[10px] tabular text-fg-mute uppercase tracking-eyebrow"
                    style={{writingMode: "vertical-rl", transform: "rotate(180deg)"}}
                >
                    {timestamp}
                </div>

                <div className="text-fg-dim font-mono text-[10px] tabular">
                    #{decision.id.replace(/^d-/, "")}
                </div>
            </aside>

            {/* Right body */}
            <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-5 border-b border-border-soft bg-surface">
                    <p className="font-mono text-[11px] text-fg-mute tabular">
                        decision/<span className="text-bone">{decision.id}</span>
                    </p>
                    <DecisionHeadline decision={decision} />
                </div>

                <div className="px-6 py-6 space-y-7">
                    {/* Agent */}
                    <Section label="Actor">
                        <ActorBlock decision={decision} agent={agent} />
                    </Section>

                    {/* Market context */}
                    {market && (
                        <Section label="Market">
                            <Link
                                href={`/markets/${market.id}`}
                                className="block group"
                            >
                                <p className="font-mono text-[10.5px] uppercase tracking-eyebrow text-amber mb-1">
                                    mkt-{market.id.padStart(3, "0")}
                                </p>
                                <p className="font-display text-[16px] font-bold text-bone leading-snug group-hover:text-amber transition-colors">
                                    {market.question}
                                </p>
                                <p className="mt-2 font-mono text-[11px] text-fg-mute tabular">
                                    {market.tier} tier · {market.status}
                                </p>
                            </Link>
                        </Section>
                    )}

                    {/* Payload */}
                    <Section label="Payload">
                        <PayloadBlock decision={decision} />
                    </Section>

                    {/* IPFS reasoning if present */}
                    {decision.payload.reasoning && decision.payload.ipfsHash && (
                        <Section label={
                            decision.agentType === "Trader" ? "Reasoning · claude-haiku-4-5" : "Reasoning"
                        }>
                            <div className="border-l border-amber pl-4 bg-night-deep py-3 -mr-1">
                                <p className="text-[13.5px] leading-relaxed text-bone">
                                    {decision.payload.reasoning}
                                </p>
                            </div>
                            <a
                                href={`https://gateway.pinata.cloud/ipfs/${decision.payload.ipfsHash.replace(/^ipfs:\/\//, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute hover:text-amber"
                            >
                                <ArrowSquareOut size={11} weight="regular" />
                                ipfs://{decision.payload.ipfsHash.replace(/^ipfs:\/\//, "").slice(0, 14)}…
                            </a>
                        </Section>
                    )}

                    {/* Tx info */}
                    <Section label="Transaction">
                        <KV k="Block" v={`#${block.toLocaleString("en-US")}`} mono />
                        <KV k="Hash" v={decision.txHash} mono trunc />
                        <a
                            href={`https://sepolia.mantlescan.xyz/tx/${decision.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute hover:text-amber"
                        >
                            <ArrowSquareOut size={11} weight="regular" />
                            view on mantlescan
                        </a>
                    </Section>
                </div>
            </div>
        </>
    );
}

function DecisionHeadline({decision}: {decision: Decision}) {
    if (decision.kind === "ENTER") {
        const side = decision.payload.side ?? "—";
        const sideColor = side === "YES" ? "text-mint" : "text-coral";
        return (
            <p className="mt-2 font-display font-extrabold text-[28px] text-bone leading-tight">
                ENTER <span className={sideColor}>{side}</span>
                {decision.payload.amount && (
                    <span className="text-fg-faint text-[18px] font-normal ml-2">
                        {formatUsdt0(decision.payload.amount)} USDT0
                    </span>
                )}
            </p>
        );
    }
    if (decision.kind === "VOTE") {
        const outcome = decision.payload.outcome ?? "—";
        const outcomeColor =
            outcome === "YES" ? "text-mint" : outcome === "NO" ? "text-coral" : "text-fg-mute";
        return (
            <p className="mt-2 font-display font-extrabold text-[28px] text-bone leading-tight">
                VOTE <span className={outcomeColor}>{outcome}</span>
            </p>
        );
    }
    if (decision.kind === "FINALIZE") {
        const outcome = decision.payload.outcome ?? "—";
        const outcomeColor =
            outcome === "YES" ? "text-mint" : outcome === "NO" ? "text-coral" : "text-fg-mute";
        return (
            <p className="mt-2 font-display font-extrabold text-[28px] text-bone leading-tight">
                RESOLVED <span className={outcomeColor}>{outcome}</span>
            </p>
        );
    }
    if (decision.kind === "CLAIM") {
        return (
            <p className="mt-2 font-display font-extrabold text-[28px] text-bone leading-tight">
                CLAIM <span className="text-mint">payout</span>
            </p>
        );
    }
    if (decision.kind === "CREATE_MARKET") {
        return (
            <p className="mt-2 font-display font-extrabold text-[28px] text-bone leading-tight">
                CREATE <span className="text-amber">market</span>
            </p>
        );
    }
    return (
        <p className="mt-2 font-display font-extrabold text-[28px] text-bone leading-tight">
            {decision.kind}
        </p>
    );
}

function ActorBlock({
    decision,
    agent,
}: {
    decision: Decision;
    agent: ReturnType<typeof findAgent>;
}) {
    const isTrader = decision.kind === "ENTER" && decision.agentType === "Trader";
    const isOracle = decision.kind === "VOTE";
    const isSystem = decision.agentType === "System";

    if (isSystem) {
        return (
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 grid place-items-center border border-border bg-night">
                    <Stamp size={14} weight="regular" className="text-amber" />
                </div>
                <div>
                    <p className="font-mono text-[11px] uppercase tracking-eyebrow text-bone">
                        SYSTEM
                    </p>
                    <p className="font-mono text-[10.5px] text-fg-mute">contract-driven</p>
                </div>
            </div>
        );
    }

    if (decision.agentType === "Bettor" && !agent) {
        return (
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 grid place-items-center border border-border bg-night">
                    <User size={14} weight="regular" className="text-bone-soft" />
                </div>
                <div>
                    <p className="font-mono text-[11px] uppercase tracking-eyebrow text-bone">
                        BETTOR
                    </p>
                    <p className="font-mono text-[10.5px] text-fg-mute">human-controlled</p>
                </div>
            </div>
        );
    }

    return (
        <Link
            href={`/agents/${decision.agentId}`}
            className="flex items-center gap-3 group"
        >
            {isTrader || isOracle ? (
                <img
                    src={emblemFor(decision.agentId, isOracle ? "twilight" : "ink")}
                    alt=""
                    className="w-9 h-9 border border-border bg-night invert opacity-90"
                />
            ) : (
                <div className="w-9 h-9 grid place-items-center border border-border bg-night">
                    <User size={14} weight="regular" className="text-bone-soft" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p
                    className={cn(
                        "font-mono text-[11px] uppercase tracking-eyebrow group-hover:text-amber transition-colors",
                        isTrader && "text-amber",
                        isOracle && "text-violet",
                        !isTrader && !isOracle && "text-bone"
                    )}
                >
                    {isTrader && `Trader #${decision.agentId}`}
                    {isOracle && `Oracle #${decision.agentId}`}
                    {!isTrader && !isOracle && decision.agentType.toUpperCase()}
                </p>
                {agent && (
                    <p className="font-mono text-[10.5px] text-fg-mute tabular">
                        {shortAddress(agent.owner)}
                        {agent.reputation > 0 && (
                            <span className="ml-2 text-fg-faint">
                                · rep {agent.reputation}
                            </span>
                        )}
                    </p>
                )}
            </div>
            {isTrader && (
                <Robot size={12} weight="regular" className="text-amber/60 shrink-0" />
            )}
        </Link>
    );
}

function PayloadBlock({decision}: {decision: Decision}) {
    const rows: {k: string; v: string; tone?: "mint" | "coral" | "amber"}[] = [];
    const p = decision.payload;
    if (p.side) {
        rows.push({k: "Side", v: p.side, tone: p.side === "YES" ? "mint" : "coral"});
    }
    if (p.outcome) {
        rows.push({
            k: "Outcome",
            v: p.outcome,
            tone:
                p.outcome === "YES" ? "mint" : p.outcome === "NO" ? "coral" : undefined,
        });
    }
    if (p.amount != null) {
        rows.push({k: "Amount", v: `${formatUsdt0(p.amount)} USDT0`});
    }
    if (p.price != null) {
        rows.push({k: "Price", v: p.price.toFixed(2)});
    }
    if (p.alloraForecast != null) {
        rows.push({k: "Allora forecast", v: `${(p.alloraForecast * 100).toFixed(0)}% YES`, tone: "mint"});
    }
    if (p.nansenWallets != null) {
        rows.push({k: "Nansen wallets", v: p.nansenWallets.toString()});
    }
    if (p.confidence != null) {
        rows.push({k: "Confidence", v: `${(p.confidence * 100).toFixed(0)}%`, tone: "amber"});
    }
    if (p.sources && p.sources.length > 0) {
        rows.push({k: "Sources", v: p.sources.join(" · ")});
    }

    if (rows.length === 0) {
        return (
            <p className="font-mono text-[12px] text-fg-mute italic">
                no additional payload
            </p>
        );
    }

    return (
        <div className="border border-border-soft bg-night-deep divide-y divide-border-soft">
            {rows.map((r) => (
                <KV key={r.k} k={r.k} v={r.v} tone={r.tone} mono />
            ))}
        </div>
    );
}

function Section({label, children}: {label: string; children: React.ReactNode}) {
    return (
        <section>
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-faint mb-3">
                {label}
            </p>
            {children}
        </section>
    );
}

function KV({
    k,
    v,
    tone,
    mono,
    trunc,
}: {
    k: string;
    v: string;
    tone?: "mint" | "coral" | "amber";
    mono?: boolean;
    trunc?: boolean;
}) {
    const toneClass =
        tone === "mint"
            ? "text-mint"
            : tone === "coral"
              ? "text-coral"
              : tone === "amber"
                ? "text-amber"
                : "text-bone";
    return (
        <div className="flex items-baseline justify-between gap-4 px-3 py-2.5">
            <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute shrink-0">
                {k}
            </span>
            <span
                className={cn(
                    mono ? "font-mono text-[12px] tabular" : "text-[13px]",
                    "text-right",
                    trunc && "truncate max-w-[280px]",
                    toneClass
                )}
            >
                {v}
            </span>
        </div>
    );
}
