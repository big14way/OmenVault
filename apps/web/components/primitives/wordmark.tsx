import {cn} from "@/lib/cn";

export function Wordmark({className}: {className?: string}) {
    return (
        <span className={cn("inline-flex items-center gap-2 select-none group/wm", className)}>
            <span className="relative inline-flex items-center justify-center w-5 h-5">
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                    <circle
                        cx="12"
                        cy="12"
                        r="10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                    />
                    <line
                        x1="12"
                        y1="0.5"
                        x2="12"
                        y2="3.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                    />
                </svg>
                {/* Pulsing ember dot inside the ring */}
                <span
                    className="absolute w-2 h-2 rounded-full bg-amber animate-breathe"
                    style={{boxShadow: "0 0 8px rgba(242, 163, 65, 0.8)"}}
                />
            </span>
            <span className="font-display text-[20px] leading-none tracking-tightest font-extrabold">
                omen<span className="text-amber">/</span>vault
            </span>
        </span>
    );
}
