import Link from "next/link";
import {ArrowLeft, Eye} from "@phosphor-icons/react/dist/ssr";
import {emblemFor} from "@/lib/emblem";
import {formatPercent, shortAddress} from "@/lib/format";
import type {Agent} from "@/lib/types";

interface OracleHeaderProps {
    agent: Agent;
    pendingCount: number;
}

export function OracleHeader({agent, pendingCount}: OracleHeaderProps) {
    return (
        <section className="border-b border-border">
            <div className="max-w-[1440px] mx-auto w-full px-6 md:px-10 pt-6 pb-10">
                {/* Crumb */}
                <div className="mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-eyebrow text-fg-mute flex-wrap">
                    <Link
                        href={`/agents/${agent.id}`}
                        className="inline-flex items-center gap-1.5 hover:text-amber"
                    >
                        <ArrowLeft size={11} weight="regular" />
                        Oracle #{agent.id} dossier
                    </Link>
                    <span className="text-fg-dim">/</span>
                    <span className="text-bone">operator dashboard</span>
                </div>

                <div className="flex items-start gap-6 mb-7">
                    <img
                        src={emblemFor(agent.id, "twilight")}
                        alt=""
                        className="w-16 h-16 md:w-20 md:h-20 border border-border bg-night invert opacity-95 shrink-0"
                    />
                    <div>
                        <h1 className="font-display font-extrabold text-display-md text-bone leading-tight">
                            The bench
                        </h1>
                        <p className="mt-2 font-mono text-[12.5px] text-fg-mute tabular flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span>
                                operating as <span className="text-violet">oracle #{agent.id}</span>
                            </span>
                            <span className="text-fg-dim">·</span>
                            <span>
                                {shortAddress(agent.owner)}
                            </span>
                            <span className="text-fg-dim">·</span>
                            <span>
                                rep <span className="text-bone">{agent.reputation}</span>
                            </span>
                            {agent.majorityAlignment != null && (
                                <>
                                    <span className="text-fg-dim">·</span>
                                    <span>
                                        majority{" "}
                                        <span className="text-bone">
                                            {formatPercent(agent.majorityAlignment, {decimals: 0})}
                                        </span>
                                    </span>
                                </>
                            )}
                            <span className="text-fg-dim">·</span>
                            <span>
                                pending <span className="text-amber">{pendingCount}</span>
                            </span>
                        </p>
                    </div>
                </div>

                {/* Mock-mode banner */}
                <div className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-eyebrow text-fg-faint border border-border-soft bg-surface px-3 py-1.5">
                    <Eye size={11} weight="regular" className="text-amber" />
                    viewing as operator · wallet wiring pending
                </div>
            </div>
        </section>
    );
}
