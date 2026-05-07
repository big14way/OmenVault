import {cva, type VariantProps} from "class-variance-authority";
import {cn} from "@/lib/cn";

const badgeStyles = cva(
    "inline-flex items-center gap-1.5 font-mono uppercase tracking-eyebrow text-[10px] px-2 py-1 border",
    {
        variants: {
            tone: {
                ink: "border-bone/40 text-bone bg-surface",
                mute: "border-border text-fg-mute bg-surface-soft",
                forest: "border-mint/40 text-mint bg-mint-glow",
                mint: "border-mint/40 text-mint bg-mint-glow",
                crimson: "border-coral/40 text-coral bg-coral-glow",
                coral: "border-coral/40 text-coral bg-coral-glow",
                terracotta: "border-amber/40 text-amber bg-amber-glow",
                amber: "border-amber/40 text-amber bg-amber-glow",
                twilight: "border-violet/40 text-violet bg-violet-glow",
                violet: "border-violet/40 text-violet bg-violet-glow",
                live: "border-amber/60 text-amber bg-amber-glow",
            },
            size: {
                sm: "text-[9px] px-1.5 py-0.5",
                md: "text-[10px] px-2 py-1",
            },
        },
        defaultVariants: {tone: "ink", size: "md"},
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeStyles> {}

export function Badge({className, tone, size, ...props}: BadgeProps) {
    return <span className={cn(badgeStyles({tone, size}), className)} {...props} />;
}

export function LiveDot({className}: {className?: string}) {
    return (
        <span className={cn("relative inline-flex h-1.5 w-1.5", className)}>
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber opacity-60 animate-ping" />
            <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber"
                style={{boxShadow: "0 0 8px rgba(242, 163, 65, 0.8)"}}
            />
        </span>
    );
}
