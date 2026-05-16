"use client";

import Link from "next/link";
import {useMemo, useState} from "react";
import {motion} from "framer-motion";
import {ArrowRight, Stamp} from "@phosphor-icons/react/dist/ssr";
import {toast} from "sonner";
import {useAccount} from "wagmi";
import type {Address} from "viem";
import {keccak256, toBytes} from "viem";
import {Button} from "@/components/primitives/button";
import {emblemFor} from "@/lib/emblem";
import {cn} from "@/lib/cn";
import {formatDateLong, relativeTime, shortAddress, timeUntil} from "@/lib/format";
import {useAgents} from "@/lib/web3/hooks/use-agents";
import {useMarkets} from "@/lib/web3/hooks/use-markets";
import {useDecisions} from "@/lib/web3/hooks/use-decisions";
import {useAgentHeartbeats} from "@/lib/web3/hooks/use-agent-heartbeats";
import {useResolution, useFinalize} from "@/lib/web3/hooks/use-resolution";
import {useSubmitVote} from "@/lib/web3/hooks/use-submit-vote";
import type {Market} from "@/lib/types";

/**
 * /swarm — operator-side overview of the oracle network.
 *   - Header: agents online, pending markets, finalized last 24h.
 *   - Pending list: each resolving market with a 3-slot vote tray + an
 *     inline "submit vote" form for any connected wallet that holds
 *     ORACLE_ROLE + a registered ERC-8004 agent token.
 *   - Activity feed: recent VOTE / FINALIZE decisions.
 *
 * The vote form is the "admin shortcut" for testing the resolve flow without
 * having all three oracle bots running; it just signs the same digest the
 * bots would and posts it.
 */
export default function SwarmPage() {
    const {data: agents} = useAgents();
    const {data: markets} = useMarkets();
    const {data: decisions} = useDecisions();
    const {data: heartbeats} = useAgentHeartbeats();

    const oracleAgents = useMemo(
        () => (agents ?? []).filter((a) => a.type === "OracleNode"),
        [agents],
    );

    const activeNow = useMemo(() => {
        if (!heartbeats) return 0;
        const cutoff = Math.floor(Date.now() / 1000) - 30 * 60;
        return oracleAgents.filter((a) => {
            const hb = heartbeats.get(a.id);
            return hb && hb.lastSeenSec >= cutoff;
        }).length;
    }, [oracleAgents, heartbeats]);

    const pending = useMemo(
        () => (markets ?? []).filter((m) => m.status === "resolving"),
        [markets],
    );

    const finalized24h = useMemo(() => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        return (decisions ?? []).filter(
            (d) => d.kind === "FINALIZE" && d.timestamp >= cutoff,
        ).length;
    }, [decisions]);

    const recent = useMemo(() => {
        return (decisions ?? [])
            .filter((d) => d.kind === "VOTE" || d.kind === "FINALIZE")
            .slice(0, 12);
    }, [decisions]);

    return (
        <main className="relative flex-1 flex flex-col pb-24">
            {/* Header */}
            <section className="border-b border-border">
                <div className="max-w-[1440px] mx-auto w-full px-6 md:px-10 pt-10 pb-8">
                    <div className="flex items-end justify-between gap-6 flex-wrap">
                        <div>
                            <h1 className="font-display font-extrabold text-display-lg text-bone leading-[1.02]">
                                Oracle swarm
                            </h1>
                            <p className="mt-3 font-mono text-[13px] text-fg-mute tabular max-w-prose">
                                Three independent ERC-8004 agents post signed verdicts on every
                                market. Majority wins; ties revert and re-vote.
                            </p>
                        </div>
                    </div>

                    <div className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-px bg-border max-w-3xl">
                        <Stat label="Oracle agents" value={oracleAgents.length.toString()} />
                        <Stat label="Online (30m)" value={activeNow.toString()} tone={activeNow > 0 ? "mint" : undefined} />
                        <Stat label="Pending" value={pending.length.toString()} tone={pending.length > 0 ? "amber" : undefined} />
                        <Stat label="Finalized 24h" value={finalized24h.toString()} />
                    </div>
                </div>
            </section>

            {/* Pending verdicts */}
            <section className="max-w-[1440px] mx-auto w-full px-6 md:px-10 pt-10 flex-1 flex flex-col gap-10">
                <div>
                    <header className="flex items-baseline justify-between mb-5">
                        <h2 className="font-display font-bold text-2xl text-bone">
                            Pending verdicts
                        </h2>
                        <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute tabular">
                            {pending.length} markets past resolution
                        </span>
                    </header>

                    {pending.length === 0 ? (
                        <div className="border border-border bg-night px-6 py-10 text-center">
                            <p className="font-mono text-[12px] text-fg-mute">
                                No markets are past their resolution date right now.
                            </p>
                            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-faint">
                                Create one via{" "}
                                <Link href="/markets/new" className="text-amber hover:text-amber-soft underline-draw">
                                    /markets/new
                                </Link>{" "}
                                with a near-future date to test the swarm.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-px bg-border border border-border">
                            {pending.map((m) => (
                                <PendingMarketRow key={m.address} market={m} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Oracle roster */}
                <div>
                    <header className="flex items-baseline justify-between mb-5">
                        <h2 className="font-display font-bold text-2xl text-bone">
                            Oracle nodes
                        </h2>
                        <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute tabular">
                            {oracleAgents.length} registered
                        </span>
                    </header>

                    {oracleAgents.length === 0 ? (
                        <div className="border border-border bg-night px-6 py-10 text-center">
                            <p className="font-mono text-[12px] text-fg-mute">
                                No oracle agents registered yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
                            {oracleAgents.map((a) => {
                                const hb = heartbeats?.get(a.id);
                                const lastSeen = hb ? hb.lastSeenSec * 1000 : a.lastActionAt;
                                const online = Date.now() - lastSeen < 30 * 60_000;
                                return (
                                    <Link
                                        key={a.id}
                                        href={`/oracle/${a.id}`}
                                        className="group bg-night p-5 hover:bg-surface transition-colors"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <img
                                                src={emblemFor(a.id, "twilight")}
                                                alt=""
                                                className="w-9 h-9 border border-border bg-night-deep invert opacity-95"
                                            />
                                            <div className="flex flex-col">
                                                <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-violet tabular">
                                                    ORACLE #{a.id}
                                                </span>
                                                <span className="font-mono text-[10.5px] tabular text-fg-faint">
                                                    {shortAddress(a.owner)}
                                                </span>
                                            </div>
                                            {online && (
                                                <span
                                                    className="ml-auto inline-block w-1.5 h-1.5 rounded-full bg-mint animate-pulse"
                                                    style={{boxShadow: "0 0 6px rgba(118, 217, 168, 0.75)"}}
                                                    title="Active in last 30 minutes"
                                                />
                                            )}
                                        </div>
                                        <dl className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular">
                                            <Cell label="rep" value={a.reputation.toString()} />
                                            <Cell label="last seen" value={hb ? relativeTime(hb.lastSeenSec * 1000) : "—"} />
                                        </dl>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recent swarm activity */}
                <div>
                    <header className="flex items-baseline justify-between mb-5">
                        <h2 className="font-display font-bold text-2xl text-bone">
                            Recent activity
                        </h2>
                        <Link
                            href="/audit?kind=vote"
                            className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute hover:text-amber underline-draw"
                        >
                            View all in audit ↗
                        </Link>
                    </header>

                    {recent.length === 0 ? (
                        <p className="font-mono text-[12px] text-fg-mute">
                            No on-chain vote or finalize events recorded yet.
                        </p>
                    ) : (
                        <ul className="border border-border bg-night divide-y divide-border-soft">
                            {recent.map((d) => (
                                <motion.li
                                    key={d.id}
                                    initial={{opacity: 0, x: -6}}
                                    animate={{opacity: 1, x: 0}}
                                    transition={{duration: 0.4, ease: [0.22, 1, 0.36, 1]}}
                                    className="px-4 py-2.5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-eyebrow tabular"
                                >
                                    <span className="text-fg-faint w-12 shrink-0">
                                        {relativeTime(d.timestamp).replace(" ago", "")}
                                    </span>
                                    <Stamp size={11} weight="regular" className="text-violet shrink-0" />
                                    <span className="text-bone shrink-0">
                                        {d.kind === "VOTE" ? `ORACLE#${d.agentId}` : "FINALIZE"}
                                    </span>
                                    <span className="text-fg-mute">
                                        {d.kind === "VOTE" ? "vote" : "settle"}
                                    </span>
                                    {d.marketId && (
                                        <Link
                                            href={`/markets/${d.marketId}`}
                                            className="ml-auto text-fg-faint hover:text-amber underline-draw"
                                        >
                                            {d.marketId.startsWith("0x") && d.marketId.length === 42
                                                ? `${d.marketId.slice(0, 6)}…${d.marketId.slice(-4)}`
                                                : `MKT-${d.marketId.padStart(3, "0")}`}
                                        </Link>
                                    )}
                                </motion.li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>
        </main>
    );
}

function PendingMarketRow({market}: {market: Market}) {
    const {data: res} = useResolution(market.address as Address);
    const finalize = useFinalize();
    const submitVote = useSubmitVote();
    const {isConnected} = useAccount();
    const [voteSide, setVoteSide] = useState<"YES" | "NO" | "INVALID">("YES");
    const [showVoteForm, setShowVoteForm] = useState(false);

    const votes = res?.votes ?? [];
    const voteCount = res?.voteCount ?? 0;
    const readyToFinalize = voteCount >= 3 && !res?.finalized;

    const onSubmit = async () => {
        try {
            const reasoningHash = keccak256(toBytes(`swarm-ui:${market.address}:${voteSide}:${Date.now()}`));
            toast.loading("Confirm vote signature in MetaMask…", {id: `vote-${market.address}`});
            const r = await submitVote.mutateAsync({
                market: market.address as Address,
                vote: voteSide,
                reasoningHash,
            });
            const url = `https://explorer.sepolia.mantle.xyz/tx/${r.hash}`;
            toast.success(r.slowReceipt ? "Vote submitted" : `Voted ${voteSide}`, {
                id: `vote-${market.address}`,
                description: r.slowReceipt
                    ? "RPC was slow; vote will appear shortly."
                    : `Vote ${voteCount + 1}/3 landed on chain.`,
                action: {
                    label: "View tx",
                    onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
                },
            });
            setShowVoteForm(false);
        } catch (err: any) {
            toast.error("Vote failed", {
                id: `vote-${market.address}`,
                description: err?.shortMessage ?? err?.message?.slice(0, 100) ?? "unknown",
            });
        }
    };

    const onFinalize = async () => {
        try {
            toast.loading("Confirm finalize in MetaMask…", {id: `finalize-${market.address}`});
            const r = await finalize.mutateAsync(market.address as Address);
            const url = `https://explorer.sepolia.mantle.xyz/tx/${r.hash}`;
            toast.success(r.slowReceipt ? "Finalize submitted" : "Market finalized", {
                id: `finalize-${market.address}`,
                description: r.slowReceipt
                    ? "RPC was slow; result will appear shortly."
                    : "Outcome is on chain. Winners can claim.",
                action: {
                    label: "View tx",
                    onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
                },
            });
        } catch (err: any) {
            toast.error("Finalize failed", {
                id: `finalize-${market.address}`,
                description: err?.shortMessage ?? err?.message?.slice(0, 100) ?? "unknown",
            });
        }
    };

    return (
        <div className="bg-night px-5 py-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-5 min-w-0">
                <Link
                    href={`/markets/${market.address}`}
                    className="font-display font-bold text-base text-bone hover:text-amber transition-colors line-clamp-2 underline-draw"
                >
                    {market.question}
                </Link>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute tabular">
                    {market.tier} · resolved {formatDateLong(market.resolutionAt)} ({timeUntil(market.resolutionAt)})
                </p>
            </div>

            {/* Vote tray */}
            <div className="md:col-span-3">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute mb-1.5">
                    Oracle votes {voteCount}/3
                </p>
                <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => {
                        const v = votes[i];
                        return (
                            <div
                                key={i}
                                className={cn(
                                    "flex-1 h-7 border flex items-center justify-center font-mono text-[10px] uppercase tracking-eyebrow tabular",
                                    v === "YES" && "border-mint bg-mint/10 text-mint",
                                    v === "NO" && "border-coral bg-coral/10 text-coral",
                                    v === "INVALID" && "border-border text-fg-mute",
                                    !v && "border-border text-fg-faint/50",
                                )}
                            >
                                {v ?? "—"}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="md:col-span-4 flex flex-col gap-2 items-end">
                {readyToFinalize ? (
                    <Button
                        size="sm"
                        variant="primary"
                        onClick={onFinalize}
                        disabled={finalize.isPending}
                    >
                        {finalize.isPending ? "Finalizing…" : "Finalize"}
                        <ArrowRight size={12} weight="regular" />
                    </Button>
                ) : isConnected && voteCount < 3 ? (
                    showVoteForm ? (
                        <div className="flex items-center gap-2">
                            <div className="inline-flex border border-border">
                                {(["YES", "NO", "INVALID"] as const).map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setVoteSide(opt)}
                                        className={cn(
                                            "px-2.5 h-7 font-mono text-[10px] uppercase tracking-eyebrow tabular border-r border-border last:border-r-0 transition-colors",
                                            voteSide === opt
                                                ? opt === "YES"
                                                    ? "bg-mint/15 text-mint"
                                                    : opt === "NO"
                                                      ? "bg-coral/15 text-coral"
                                                      : "bg-surface text-bone"
                                                : "text-fg-mute hover:text-bone",
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={onSubmit}
                                disabled={submitVote.isPending}
                            >
                                {submitVote.isPending ? "…" : "Sign"}
                            </Button>
                            <button
                                type="button"
                                onClick={() => setShowVoteForm(false)}
                                className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute hover:text-bone"
                            >
                                cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowVoteForm(true)}
                            className="font-mono text-[10.5px] uppercase tracking-eyebrow text-violet hover:text-amber underline-draw"
                            title="Submit a vote (requires ORACLE_ROLE + registered agent)"
                        >
                            Submit vote ↗
                        </button>
                    )
                ) : (
                    <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-mute">
                        Awaiting oracle bots
                    </span>
                )}

                <Link
                    href={`/markets/${market.address}`}
                    className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-faint hover:text-amber"
                >
                    Open market →
                </Link>
            </div>
        </div>
    );
}

function Stat({label, value, tone}: {label: string; value: string; tone?: "mint" | "amber"}) {
    return (
        <div className="bg-night p-4">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute">{label}</p>
            <p
                className={cn(
                    "mt-1.5 font-display font-bold text-xl tabular leading-none",
                    tone === "mint" ? "text-mint" : tone === "amber" ? "text-amber" : "text-bone",
                )}
            >
                {value}
            </p>
        </div>
    );
}

function Cell({label, value}: {label: string; value: string}) {
    return (
        <div>
            <span className="text-fg-mute uppercase tracking-eyebrow text-[9px] mr-1.5">{label}</span>
            <span className="text-bone">{value}</span>
        </div>
    );
}
