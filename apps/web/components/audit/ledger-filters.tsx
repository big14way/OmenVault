"use client";

import {cn} from "@/lib/cn";

export type LedgerType = "all" | "trader" | "oracle" | "bettor" | "system";
export type LedgerKind =
    | "all"
    | "enter"
    | "exit"
    | "vote"
    | "finalize"
    | "claim"
    | "create";
export type LedgerRange = "1h" | "24h" | "7d" | "all";

export interface LedgerFilterState {
    type: LedgerType;
    kind: LedgerKind;
    market: string; // "all" or market id
    range: LedgerRange;
}

const TYPES: LedgerType[] = ["all", "trader", "oracle", "bettor", "system"];
const KINDS: LedgerKind[] = [
    "all",
    "enter",
    "exit",
    "vote",
    "finalize",
    "claim",
    "create",
];
const RANGES: LedgerRange[] = ["1h", "24h", "7d", "all"];

interface Props {
    value: LedgerFilterState;
    onChange: (next: LedgerFilterState) => void;
    markets: {id: string; label: string}[];
}

/**
 * CLI-style inline filters. Each row is `field[ opt opt opt ]`.
 * Reads as hand-typed config, not a generic chip-bar.
 */
export function LedgerFilters({value, onChange, markets}: Props) {
    return (
        <div className="border-y border-border bg-night-deep">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-5 font-mono text-[12px] space-y-2.5">
                <FilterRow label="type">
                    {TYPES.map((t) => (
                        <FilterWord
                            key={t}
                            active={value.type === t}
                            onClick={() => onChange({...value, type: t})}
                        >
                            {t}
                        </FilterWord>
                    ))}
                </FilterRow>

                <FilterRow label="kind">
                    {KINDS.map((k) => (
                        <FilterWord
                            key={k}
                            active={value.kind === k}
                            onClick={() => onChange({...value, kind: k})}
                        >
                            {k}
                        </FilterWord>
                    ))}
                </FilterRow>

                <FilterRow label="market">
                    <FilterWord
                        active={value.market === "all"}
                        onClick={() => onChange({...value, market: "all"})}
                    >
                        all
                    </FilterWord>
                    {markets.map((m) => (
                        <FilterWord
                            key={m.id}
                            active={value.market === m.id}
                            onClick={() => onChange({...value, market: m.id})}
                        >
                            mkt-{m.id.padStart(3, "0")}
                        </FilterWord>
                    ))}
                </FilterRow>

                <FilterRow label="range">
                    {RANGES.map((r) => (
                        <FilterWord
                            key={r}
                            active={value.range === r}
                            onClick={() => onChange({...value, range: r})}
                        >
                            {r}
                        </FilterWord>
                    ))}
                </FilterRow>
            </div>
        </div>
    );
}

function FilterRow({label, children}: {label: string; children: React.ReactNode}) {
    return (
        <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-fg-faint shrink-0 select-none">{label}</span>
            <span className="text-fg-dim shrink-0 select-none">[</span>
            <span className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">{children}</span>
            <span className="text-fg-dim shrink-0 select-none">]</span>
        </div>
    );
}

function FilterWord({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "transition-colors duration-200 select-none cursor-pointer",
                active
                    ? "text-amber"
                    : "text-fg-mute hover:text-bone"
            )}
        >
            {children}
        </button>
    );
}
