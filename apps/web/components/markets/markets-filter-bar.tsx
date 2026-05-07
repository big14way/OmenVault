"use client";

import {useState} from "react";
import {motion} from "framer-motion";
import {MagnifyingGlass, SortAscending} from "@phosphor-icons/react/dist/ssr";
import {cn} from "@/lib/cn";

type Status = "all" | "active" | "resolving" | "resolved";
type Tier = "all" | "USDT0" | "USDY" | "sUSDe";
type Sort = "volume" | "yield" | "deadline" | "ai";

const STATUSES: {key: Status; label: string}[] = [
    {key: "all", label: "All"},
    {key: "active", label: "Active"},
    {key: "resolving", label: "Resolving"},
    {key: "resolved", label: "Resolved"},
];

const TIERS: {key: Tier; label: string}[] = [
    {key: "all", label: "All tiers"},
    {key: "USDT0", label: "USDT0"},
    {key: "USDY", label: "USDY"},
    {key: "sUSDe", label: "sUSDe"},
];

const SORTS: {key: Sort; label: string}[] = [
    {key: "volume", label: "Volume"},
    {key: "yield", label: "Yield"},
    {key: "deadline", label: "Deadline"},
    {key: "ai", label: "AI activity"},
];

export interface MarketFilters {
    status: Status;
    tier: Tier;
    sort: Sort;
    search: string;
}

interface Props {
    value: MarketFilters;
    onChange: (next: MarketFilters) => void;
    counts?: Partial<Record<Status, number>>;
}

export function MarketsFilterBar({value, onChange, counts}: Props) {
    const [searching, setSearching] = useState(false);

    return (
        <div className="border border-border bg-surface">
            <div className="flex flex-col lg:flex-row lg:items-center lg:divide-x lg:divide-border">
                {/* Status segmented control */}
                <div className="flex items-stretch overflow-x-auto no-scrollbar">
                    {STATUSES.map((s) => {
                        const active = value.status === s.key;
                        const count = counts?.[s.key];
                        return (
                            <button
                                key={s.key}
                                onClick={() => onChange({...value, status: s.key})}
                                className={cn(
                                    "relative px-5 py-4 font-mono uppercase tracking-eyebrow text-[11px] transition-colors whitespace-nowrap",
                                    active ? "text-amber" : "text-fg-mute hover:text-bone"
                                )}
                            >
                                {s.label}
                                {count != null && (
                                    <span className="ml-2 text-[10px] opacity-70 tabular">{count}</span>
                                )}
                                {active && (
                                    <motion.span
                                        layoutId="status-underline"
                                        className="absolute inset-x-3 -bottom-px h-px bg-amber"
                                        style={{boxShadow: "0 0 6px rgba(242, 163, 65, 0.6)"}}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tier */}
                <div className="flex items-center px-5 py-2.5 gap-3 lg:flex-1">
                    <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute shrink-0">
                        Tier
                    </span>
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {TIERS.map((t) => {
                            const active = value.tier === t.key;
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => onChange({...value, tier: t.key})}
                                    className={cn(
                                        "px-3 h-8 border font-mono text-[11px] uppercase tracking-eyebrow transition-colors whitespace-nowrap",
                                        active
                                            ? "border-amber bg-amber text-night"
                                            : "border-border text-fg-mute hover:border-bone hover:text-bone"
                                    )}
                                >
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sort */}
                <div className="flex items-center px-5 py-2.5 gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-eyebrow text-fg-mute shrink-0 inline-flex items-center gap-1.5">
                        <SortAscending size={12} weight="regular" />
                        Sort
                    </span>
                    <select
                        value={value.sort}
                        onChange={(e) => onChange({...value, sort: e.target.value as Sort})}
                        className="bg-transparent font-mono text-[11px] uppercase tracking-eyebrow text-bone hover:text-amber cursor-pointer focus:outline-none"
                    >
                        {SORTS.map((s) => (
                            <option key={s.key} value={s.key} className="bg-surface text-bone">
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <div className="flex items-center px-5 py-2.5 gap-2 lg:w-72">
                    <MagnifyingGlass
                        size={14}
                        weight="regular"
                        className={cn(
                            "transition-colors",
                            searching ? "text-amber" : "text-fg-mute"
                        )}
                    />
                    <input
                        type="text"
                        placeholder="Search markets…"
                        value={value.search}
                        onFocus={() => setSearching(true)}
                        onBlur={() => setSearching(false)}
                        onChange={(e) => onChange({...value, search: e.target.value})}
                        className="flex-1 bg-transparent font-mono text-[12px] text-bone placeholder:text-fg-faint focus:outline-none"
                    />
                </div>
            </div>
        </div>
    );
}
