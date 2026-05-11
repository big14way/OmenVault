import Link from "next/link";
import {CheckCircle, XCircle} from "@phosphor-icons/react/dist/ssr";
import {relativeTime} from "@/lib/format";
import type {Decision, Outcome} from "@/lib/types";
import {cn} from "@/lib/cn";

interface VotingHistoryRowProps {
    decision: Decision;
    majorityOutcome?: Outcome; // if known
}

const OUTCOME_TONE: Record<Outcome, string> = {
    YES: "text-mint",
    NO: "text-coral",
    INVALID: "text-fg-mute",
};

export function VotingHistoryRow({decision, majorityOutcome}: VotingHistoryRowProps) {
    const myVote = decision.payload.outcome as Outcome | undefined;
    const aligned = majorityOutcome && myVote && myVote === majorityOutcome;
    const repDelta = majorityOutcome ? (aligned ? 1 : -1) : null;

    return (
        <Link
            href={
                decision.marketId
                    ? `/markets/${decision.marketId}`
                    : "/audit"
            }
            className="group flex items-center gap-3 md:gap-5 px-4 md:px-5 py-3 border-b border-border-soft last:border-b-0 hover:bg-surface transition-colors"
        >
            {/* Time */}
            <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-faint tabular shrink-0 w-14">
                {relativeTime(decision.timestamp).replace(" ago", "")}
            </span>

            {/* Market ref */}
            {decision.marketId && (
                <span className="font-mono text-[10.5px] uppercase tracking-eyebrow text-bone-soft tabular shrink-0 w-20">
                    mkt-{decision.marketId.padStart(3, "0")}
                </span>
            )}

            {/* My vote */}
            <span className="font-mono text-[11px] uppercase tracking-eyebrow shrink-0 w-28">
                <span className="text-fg-mute">voted</span>{" "}
                {myVote && <span className={OUTCOME_TONE[myVote]}>{myVote}</span>}
            </span>

            {/* Majority */}
            <span className="font-mono text-[11px] uppercase tracking-eyebrow shrink-0 hidden md:inline-block w-32">
                <span className="text-fg-mute">majority</span>{" "}
                {majorityOutcome ? (
                    <span className={OUTCOME_TONE[majorityOutcome]}>{majorityOutcome}</span>
                ) : (
                    <span className="text-fg-faint">pending</span>
                )}
            </span>

            {/* Alignment + rep delta */}
            <span className="flex-1 inline-flex items-center justify-end gap-2 font-mono text-[11px] tabular">
                {repDelta !== null && aligned && (
                    <>
                        <CheckCircle size={11} weight="regular" className="text-mint" />
                        <span className="text-mint">+1 rep</span>
                    </>
                )}
                {repDelta !== null && !aligned && (
                    <>
                        <XCircle size={11} weight="regular" className="text-coral" />
                        <span className="text-coral">{repDelta} rep</span>
                    </>
                )}
                {repDelta === null && (
                    <span className="text-fg-faint">awaiting tally</span>
                )}
            </span>
        </Link>
    );
}
