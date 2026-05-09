// Display-side number/time formatters. Tabular by default — never use these for arithmetic.

export function formatUsdt0(amount: number, opts?: {compact?: boolean; sign?: boolean}) {
    const compact = opts?.compact ?? false;
    const sign = opts?.sign ?? false;
    const abs = Math.abs(amount);
    let str: string;
    if (compact) {
        if (abs >= 1_000_000) str = (amount / 1_000_000).toFixed(2) + "M";
        else if (abs >= 1_000) str = (amount / 1_000).toFixed(1) + "k";
        else str = amount.toFixed(0);
    } else {
        str = new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    }
    if (sign && amount > 0) str = "+" + str;
    return str;
}

export function formatPrice(p: number) {
    return p.toFixed(2);
}

export function formatPercent(v: number, opts?: {decimals?: number; sign?: boolean}) {
    const decimals = opts?.decimals ?? 2;
    const sign = opts?.sign ?? false;
    const str = (v * 100).toFixed(decimals) + "%";
    return sign && v > 0 ? "+" + str : str;
}

export function formatBps(bps: number) {
    return (bps / 100).toFixed(2) + "%";
}

export function shortAddress(addr: string) {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function relativeTime(date: Date | number): string {
    const ts = typeof date === "number" ? date : date.getTime();
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d ago`;
    const mo = Math.floor(day / 30);
    return `${mo}mo ago`;
}

export function timeUntil(date: Date | number): string {
    const ts = typeof date === "number" ? date : date.getTime();
    const diff = ts - Date.now();
    if (diff <= 0) return "resolving";
    const day = Math.floor(diff / 86_400_000);
    if (day >= 1) return `${day}d`;
    const hr = Math.floor(diff / 3_600_000);
    if (hr >= 1) return `${hr}h`;
    const min = Math.floor(diff / 60_000);
    return `${min}m`;
}

export function formatDateLong(date: Date | number) {
    const d = typeof date === "number" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {year: "numeric", month: "short", day: "numeric"});
}

export function formatTime(date: Date | number) {
    const d = typeof date === "number" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {hour: "2-digit", minute: "2-digit", hour12: false});
}
