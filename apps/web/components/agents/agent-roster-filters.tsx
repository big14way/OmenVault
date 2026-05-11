"use client";

import {cn} from "@/lib/cn";

export type RosterType = "all" | "trader" | "oracle" | "bettor";
export type RosterSort = "rep" | "win" | "capital" | "recent";

interface Props {
    type: RosterType;
    sort: RosterSort;
    onTypeChange: (t: RosterType) => void;
    onSortChange: (s: RosterSort) => void;
    counts: Record<RosterType, number>;
}

const TYPES: {key: RosterType; label: string}[] = [
    {key: "all", label: "all"},
    {key: "trader", label: "trader"},
    {key: "oracle", label: "oracle"},
    {key: "bettor", label: "bettor"},
];

const SORTS: {key: RosterSort; label: string}[] = [
    {key: "rep", label: "reputation"},
    {key: "win", label: "win rate"},
    {key: "capital", label: "capital"},
    {key: "recent", label: "recent"},
];

export function AgentRosterFilters({type, sort, onTypeChange, onSortChange, counts}: Props) {
    return (
        <div className="flex flex-col gap-2 font-mono text-[12px] text-bone-soft">
            <FilterBlock label="type" trailing={null}>
                {TYPES.map((t) => {
                    const active = type === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => onTypeChange(t.key)}
                            className={cn(
                                "tabular transition-colors hover:text-bone",
                                active ? "text-amber" : "text-fg-mute"
                            )}
                        >
                            {t.label}
                            <span
                                className={cn(
                                    "ml-1 text-[10px] tabular",
                                    active ? "text-amber/70" : "text-fg-faint"
                                )}
                            >
                                {counts[t.key]}
                            </span>
                        </button>
                    );
                })}
            </FilterBlock>

            <FilterBlock label="sort" trailing="↓">
                {SORTS.map((s) => {
                    const active = sort === s.key;
                    return (
                        <button
                            key={s.key}
                            onClick={() => onSortChange(s.key)}
                            className={cn(
                                "tabular transition-colors hover:text-bone",
                                active ? "text-amber" : "text-fg-mute"
                            )}
                        >
                            {s.label}
                        </button>
                    );
                })}
            </FilterBlock>
        </div>
    );
}

function FilterBlock({
    label,
    trailing,
    children,
}: {
    label: string;
    trailing: string | null;
    children: React.ReactNode;
}) {
    return (
        <div className="inline-flex items-baseline gap-2 flex-wrap">
            <span className="text-fg-mute select-none w-12 shrink-0">{label}</span>
            <span className="text-fg-faint">[</span>
            <span className="inline-flex gap-3 flex-wrap">{children}</span>
            <span className="text-fg-faint">
                {trailing ? `${trailing} ]` : "]"}
            </span>
        </div>
    );
}
