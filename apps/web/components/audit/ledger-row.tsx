"use client";

import {useEffect, useState} from "react";
import {ArrowRight, Stamp, User} from "@phosphor-icons/react/dist/ssr";
import {emblemFor} from "@/lib/emblem";
import {cn} from "@/lib/cn";
import type {Decision} from "@/lib/types";

interface LedgerRowProps {
    decision: Decision;
    onOpen: () => void;
}

/** Format a unix ms timestamp as "YYYY-MM-DD HH:MM:SS" in local time. */
function formatTimestamp(ms: number): string {
    const d = new Date(ms);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Map decision to a deterministic block number. */
function blockNumberFor(decision: Decision): number {
    // ~2s per block on Mantle. Newer events have higher block.
    const baseBlock = 3_827_401;
    const minutesAgo = Math.floor((Date.now() - decision.timestamp) / 60_000);
    return baseBlock - Math.floor(minutesAgo * 30);
}

/** Returns the kind label, role color, and action element for a decision. */
function describeDecision(d: Decision) {
    if (d.kind === "ENTER" && d.agentType === "Trader") {
        return {
            stripe: "bg-amber",
            roleColor: "text-amber",
            role: `TRADER#${d.agentId}`,
            emblem: emblemFor(d.agentId, "ink"),
            kindLabel: "ENTER",
            kindColor: d.payload.side === "YES" ? "text-mint" : "text-coral",
            actionExtra: d.payload.side ?? "",
        };
    }
    if (d.kind === "ENTER" && d.agentType === "Bettor") {
        return {
            stripe: "bg-bone/40",
            roleColor: "text-bone",
            role: "BETTOR",
            emblem: null,
            icon: User,
            kindLabel: "ENTER",
            kindColor: d.payload.side === "YES" ? "text-mint" : "text-coral",
            actionExtra: d.payload.side ?? "",
        };
    }
    if (d.kind === "VOTE") {
        return {
            stripe: "bg-violet",
            roleColor: "text-violet",
            role: `ORACLE#${d.agentId}`,
            emblem: emblemFor(d.agentId, "twilight"),
            kindLabel: "VOTE",
            kindColor:
                d.payload.outcome === "YES"
                    ? "text-mint"
                    : d.payload.outcome === "NO"
                      ? "text-coral"
                      : "text-fg-mute",
            actionExtra: d.payload.outcome ?? "",
        };
    }
    if (d.kind === "FINALIZE") {
        return {
            stripe: "bg-amber",
            roleColor: "text-amber",
            role: "SYSTEM",
            emblem: null,
            icon: Stamp,
            kindLabel: "FINAL",
            kindColor:
                d.payload.outcome === "YES"
                    ? "text-mint"
                    : d.payload.outcome === "NO"
                      ? "text-coral"
                      : "text-fg-mute",
            actionExtra: d.payload.outcome ?? "",
        };
    }
    if (d.kind === "CLAIM") {
        return {
            stripe: "bg-mint",
            roleColor: "text-bone-soft",
            role: "BETTOR",
            emblem: null,
            icon: User,
            kindLabel: "CLAIM",
            kindColor: "text-mint",
            actionExtra: "",
        };
    }
    if (d.kind === "CREATE_MARKET") {
        return {
            stripe: "bg-border-strong",
            roleColor: "text-fg-mute",
            role: "SYSTEM",
            emblem: null,
            icon: Stamp,
            kindLabel: "CREATE",
            kindColor: "text-fg-mute",
            actionExtra: "",
        };
    }
    return {
        stripe: "bg-border-strong",
        roleColor: "text-fg-mute",
        role: d.agentType.toUpperCase(),
        emblem: null,
        kindLabel: d.kind,
        kindColor: "text-fg-mute",
        actionExtra: "",
    };
}

/**
 * Single ledger row. Dense, mono throughout. Left-edge color stripe by kind.
 * If decision is < 30s old, render with a fading amber background (the
 * "ink-drying-on-paper" effect — no separate LIVE section needed).
 */
export function LedgerRow({decision, onOpen}: LedgerRowProps) {
    const desc = describeDecision(decision);
    const block = blockNumberFor(decision);
    const [fading, setFading] = useState(false);

    const ageMs = Date.now() - decision.timestamp;
    const isRecent = ageMs < 30_000;

    useEffect(() => {
        if (!isRecent) return;
        // Trigger the bg fade-out on next frame
        const id = requestAnimationFrame(() => setFading(true));
        return () => cancelAnimationFrame(id);
    }, [isRecent]);

    const IconFallback = desc.icon;

    return (
        <button
            type="button"
            onClick={onOpen}
            className={cn(
                "group relative w-full text-left flex items-center gap-4 px-4 md:px-6 py-3 border-b border-border-soft transition-colors duration-[3500ms] ease-out",
                isRecent && !fading
                    ? "bg-amber/[0.08]"
                    : "bg-transparent hover:bg-night-deep"
            )}
        >
            {/* Left edge stripe */}
            <span
                className={cn(
                    "absolute left-0 top-0 bottom-0 w-[2px] opacity-80",
                    desc.stripe
                )}
            />

            {/* Timestamp + block — narrow mono */}
            <div className="font-mono text-[11.5px] tabular text-fg-mute shrink-0 w-[230px]">
                <span className="text-bone-soft">{formatTimestamp(decision.timestamp)}</span>
                <span className="text-fg-dim ml-2">#{block.toLocaleString("en-US")}</span>
            </div>

            {/* Actor — emblem or icon + name */}
            <div className="flex items-center gap-2 shrink-0 w-[150px]">
                {desc.emblem ? (
                    <img
                        src={desc.emblem}
                        alt=""
                        className="w-4 h-4 invert opacity-80 shrink-0"
                    />
                ) : IconFallback ? (
                    <IconFallback
                        size={12}
                        weight="regular"
                        className={cn("shrink-0", desc.roleColor)}
                    />
                ) : (
                    <span className="w-4 h-4 shrink-0" />
                )}
                <span
                    className={cn(
                        "font-mono text-[11px] uppercase tracking-eyebrow",
                        desc.roleColor
                    )}
                >
                    {desc.role}
                </span>
            </div>

            {/* Action — kind label + colored outcome */}
            <div className="font-mono text-[11px] uppercase tracking-eyebrow shrink-0 w-[130px]">
                <span className="text-bone-soft">{desc.kindLabel}</span>
                {desc.actionExtra && (
                    <span className={cn("ml-1.5", desc.kindColor)}>{desc.actionExtra}</span>
                )}
            </div>

            {/* Market reference — right-anchored against the chevron */}
            <div className="ml-auto flex items-center gap-3">
                {decision.marketId && (
                    <span className="font-mono text-[11px] uppercase tracking-eyebrow text-fg-mute">
                        mkt-{decision.marketId.padStart(3, "0")}
                    </span>
                )}
                <ArrowRight
                    size={12}
                    weight="regular"
                    className="text-fg-faint group-hover:text-amber group-hover:translate-x-0.5 transition-all duration-200"
                />
            </div>
        </button>
    );
}
