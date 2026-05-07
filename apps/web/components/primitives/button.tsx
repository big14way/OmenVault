import {forwardRef} from "react";
import {Slot} from "@radix-ui/react-slot";
import {cva, type VariantProps} from "class-variance-authority";
import {cn} from "@/lib/cn";

const buttonStyles = cva(
    "group relative inline-flex items-center justify-center gap-2 font-mono uppercase tracking-eyebrow text-[11px] transition-all duration-300 ease-editorial select-none disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber focus-visible:ring-offset-1 focus-visible:ring-offset-night overflow-hidden",
    {
        variants: {
            variant: {
                // Primary CTA — amber on dark, with soft glow on hover
                primary:
                    "bg-amber text-night border border-amber hover:bg-amber-soft hover:shadow-glow",
                // Secondary — bone outline that fills on hover
                secondary:
                    "bg-transparent text-bone border border-border-strong hover:border-bone hover:bg-surface-soft",
                // Accent — same as primary, kept for back-compat
                accent:
                    "bg-amber text-night border border-amber hover:bg-amber-soft hover:shadow-glow",
                // Outline — amber border + amber text, fills with full amber on hover
                outline:
                    "bg-transparent text-amber border border-amber/40 hover:border-amber hover:bg-amber hover:text-night hover:shadow-glow",
                // Ghost — text-only, picks up amber on hover
                ghost:
                    "bg-transparent text-bone-soft border border-transparent hover:text-amber hover:bg-surface",
                // YES — mint
                yes: "bg-mint text-night border border-mint hover:bg-mint-soft hover:shadow-glow-mint",
                // NO — coral
                no: "bg-coral text-night border border-coral hover:bg-coral-soft hover:shadow-glow-coral",
                // Dim — for low-stakes actions (cancel, close)
                dim: "bg-surface text-fg-mute border border-border hover:border-border-strong hover:text-bone",
            },
            size: {
                sm: "h-8 px-3",
                md: "h-10 px-5",
                lg: "h-12 px-7",
                xl: "h-14 px-9 text-[12px]",
            },
        },
        defaultVariants: {variant: "primary", size: "md"},
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonStyles> {
    asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({className, variant, size, asChild, children, ...props}, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp ref={ref} className={cn(buttonStyles({variant, size}), className)} {...props}>
                {children}
            </Comp>
        );
    }
);
Button.displayName = "Button";
