"use client";

import {toast} from "sonner";
import {useResolution, useFinalize} from "@/lib/web3/hooks/use-resolution";
import {formatDateLong, relativeTime} from "@/lib/format";
import {cn} from "@/lib/cn";
import type {Market} from "@/lib/types";
import type {Address} from "viem";

/**
 * ResolvePanel — sidebar surface for markets that are past their resolution
 * deadline. Renders the live OracleSwarm voting state and exposes a Finalize
 * button once three votes have landed (anyone can call finalize).
 *
 * Three states it walks through:
 *   1. status "resolving" + voteCount < 3 → "Awaiting oracle votes (N/3)" with
 *      progress dots. Polled every 6s; updates as votes land in real time.
 *   2. status "resolving" + voteCount === 3 → "Ready to settle" + Finalize CTA.
 *   3. status "resolved" → "Final outcome · YES/NO/INVALID" + claim link.
 */
export function ResolvePanel({market}: {market: Market}) {
    const {data: res} = useResolution(market.address as Address);
    const finalize = useFinalize();

    const votes = res?.votes ?? [];
    const voteCount = res?.voteCount ?? 0;
    const isResolved = market.status === "resolved" || res?.finalized;
    const readyToFinalize = !isResolved && voteCount >= 3 && market.status === "resolving";

    const onFinalize = async () => {
        try {
            toast.loading("Confirm finalize in MetaMask…", {id: "finalize"});
            const r = await finalize.mutateAsync(market.address as Address);
            const url = `https://explorer.sepolia.mantle.xyz/tx/${r.hash}`;
            toast.success(r.slowReceipt ? "Finalize submitted" : "Market finalized", {
                id: "finalize",
                description: r.slowReceipt
                    ? "RPC was slow; result will appear in a few seconds."
                    : "Outcome is now on chain. Winners can claim from /portfolio.",
                action: {
                    label: "View tx",
                    onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
                },
            });
        } catch (err: any) {
            toast.error("Finalize failed", {
                id: "finalize",
                description: err?.shortMessage ?? err?.message?.slice(0, 100) ?? "unknown",
            });
        }
    };

    return (
        <div className="border border-paper-line bg-paper p-5 md:p-6">
            <p className="eyebrow mb-3">
                {isResolved ? "Settled" : voteCount >= 3 ? "Ready to settle" : "Awaiting oracle swarm"}
            </p>

            <p className="font-display font-bold text-lg leading-tight mb-2">
                {isResolved
                    ? `Final outcome · ${res?.finalOutcome ?? market.resolvedOutcome ?? "—"}`
                    : `Oracle votes  ${voteCount}/3`}
            </p>

            {/* Progress strip: three vote slots that fill as oracles report in */}
            {!isResolved && (
                <div className="mt-2 mb-3 flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => {
                        const v = votes[i];
                        return (
                            <div
                                key={i}
                                className={cn(
                                    "flex-1 h-7 border flex items-center justify-center font-mono text-[10px] uppercase tracking-eyebrow tabular",
                                    v === "YES" && "border-forest bg-forest-faint text-forest",
                                    v === "NO" && "border-crimson bg-crimson-faint text-crimson",
                                    v === "INVALID" && "border-ink-mute text-ink-mute",
                                    !v && "border-paper-edge text-ink-mute/50",
                                )}
                            >
                                {v ?? "—"}
                            </div>
                        );
                    })}
                </div>
            )}

            <p className="font-mono text-[11px] text-ink-mute tabular leading-relaxed">
                Resolution date {formatDateLong(market.resolutionAt)}.{" "}
                {!isResolved && voteCount < 3 && (
                    <>
                        The oracle swarm is checking sources. Anyone can finalize once 3 votes are in.
                    </>
                )}
                {readyToFinalize && (
                    <>Three oracles have voted. Settle the market to credit winners.</>
                )}
                {isResolved && <>Outcome is on chain. Winning positions can be claimed from your portfolio.</>}
            </p>

            {readyToFinalize && (
                <button
                    type="button"
                    onClick={onFinalize}
                    disabled={finalize.isPending}
                    className="mt-4 w-full px-4 py-3 bg-amber text-night font-mono uppercase tracking-eyebrow text-[11px] font-bold hover:bg-amber-soft transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {finalize.isPending ? "Finalizing…" : "Finalize market"}
                </button>
            )}

            {isResolved && res?.finalizedAt ? (
                <p className="mt-3 font-mono text-[10.5px] uppercase tracking-eyebrow text-ink-mute tabular">
                    Finalized {relativeTime(res.finalizedAt)}
                </p>
            ) : null}

            <div className="mt-4 pt-3 border-t border-paper-line">
                <a
                    href="/markets/new"
                    className="font-mono uppercase tracking-eyebrow text-[10.5px] text-ink-mute hover:text-amber"
                >
                    Want to bet? Deploy a fresh market →
                </a>
            </div>
        </div>
    );
}
