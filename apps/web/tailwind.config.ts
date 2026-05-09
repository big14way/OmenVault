import type {Config} from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Surfaces — slightly warm darks, not pure black
                night: {
                    DEFAULT: "#0C0D11", // page bg
                    deep: "#070810", // hero footer / void
                },
                surface: {
                    DEFAULT: "#14161C", // primary card surface
                    soft: "#1B1E25", // hover/elevated
                    sub: "#23272F", // tertiary
                },
                border: {
                    DEFAULT: "#262A33", // standard
                    soft: "#1C1F26", // faint
                    strong: "#3A4050", // emphasized
                },

                // Foreground — warm off-white, not harsh
                bone: {
                    DEFAULT: "#E8E5DD", // primary
                    soft: "#C2C0B9", // softer body
                },
                fg: {
                    mute: "#9DA0A8", // secondary
                    faint: "#6B6F77", // tertiary
                    dim: "#43464D", // very low
                },

                // Amber — primary accent (CTA / live highlight). Warm not garish.
                amber: {
                    DEFAULT: "#F2A341",
                    soft: "#FFC675",
                    glow: "#3A2A18", // 10% bg
                    deep: "#A36B25",
                },

                // Mint — YES outcome. Softer than emerald.
                mint: {
                    DEFAULT: "#6FD9AB",
                    soft: "#9FE8C8",
                    glow: "#1A2E26",
                    deep: "#3FA682",
                },

                // Coral — NO outcome. Warmer than crimson.
                coral: {
                    DEFAULT: "#E66D54",
                    soft: "#F39684",
                    glow: "#2E1F1B",
                    deep: "#A04A38",
                },

                // Violet — system / oracle accents. Used sparingly.
                violet: {
                    DEFAULT: "#9089E0",
                    soft: "#B5B0EE",
                    glow: "#1F1F33",
                },

                // Legacy aliases (lets old class names still resolve to sensible new colors).
                // Will be cleaned up as components are touched.
                ink: {
                    DEFAULT: "#E8E5DD", // was #0F1419 — flipped: text on dark
                    soft: "#C2C0B9",
                    mute: "#9DA0A8",
                    faint: "#6B6F77",
                },
                paper: {
                    DEFAULT: "#0C0D11", // was #FAF7F2 — flipped
                    warm: "#14161C",
                    line: "#262A33",
                    edge: "#3A4050",
                },
                terracotta: {
                    DEFAULT: "#F2A341",
                    soft: "#FFC675",
                    faint: "#3A2A18",
                },
                forest: {
                    DEFAULT: "#6FD9AB",
                    soft: "#9FE8C8",
                    faint: "#1A2E26",
                },
                crimson: {
                    DEFAULT: "#E66D54",
                    soft: "#F39684",
                    faint: "#2E1F1B",
                },
                twilight: {
                    DEFAULT: "#9089E0",
                    soft: "#B5B0EE",
                },
            },
            fontFamily: {
                display: [
                    "'Cabinet Grotesk'",
                    "var(--font-geist-sans)",
                    "ui-sans-serif",
                    "system-ui",
                    "sans-serif",
                ],
                sans: [
                    "var(--font-geist-sans)",
                    "ui-sans-serif",
                    "system-ui",
                    "sans-serif",
                ],
                mono: [
                    "var(--font-geist-mono)",
                    "ui-monospace",
                    "monospace",
                ],
            },
            fontSize: {
                "display-2xl": ["clamp(48px, 9vw, 120px)", {lineHeight: "0.95", letterSpacing: "-0.035em"}],
                "display-xl": ["clamp(40px, 7.5vw, 88px)", {lineHeight: "0.98", letterSpacing: "-0.03em"}],
                "display-lg": ["clamp(32px, 5.5vw, 64px)", {lineHeight: "1.02", letterSpacing: "-0.025em"}],
                "display-md": ["clamp(26px, 4vw, 44px)", {lineHeight: "1.08", letterSpacing: "-0.02em"}],
                "display-sm": ["clamp(20px, 2.5vw, 28px)", {lineHeight: "1.18", letterSpacing: "-0.01em"}],
                eyebrow: ["10.5px", {lineHeight: "1.4", letterSpacing: "0.16em"}],
                micro: ["10px", {lineHeight: "1.4", letterSpacing: "0.12em"}],
                body: ["15.5px", {lineHeight: "1.65", letterSpacing: "-0.005em"}],
                "body-lg": ["17px", {lineHeight: "1.6", letterSpacing: "-0.005em"}],
            },
            letterSpacing: {
                eyebrow: "0.16em",
                tightest: "-0.035em",
            },
            boxShadow: {
                terminal:
                    "0 0 0 1px rgba(242, 163, 65, 0.10), 0 8px 28px -12px rgba(0, 0, 0, 0.6)",
                lift: "0 18px 40px -22px rgba(0, 0, 0, 0.7), 0 4px 12px -4px rgba(0, 0, 0, 0.4)",
                glow: "0 0 24px rgba(242, 163, 65, 0.18)",
                "glow-mint": "0 0 24px rgba(111, 217, 171, 0.20)",
                "glow-coral": "0 0 24px rgba(230, 109, 84, 0.22)",
                inset: "inset 0 0 0 1px rgba(232, 229, 221, 0.04)",
            },
            animation: {
                marquee: "marquee 75s linear infinite",
                "marquee-slow": "marquee 140s linear infinite",
                "yield-tick": "yield-tick 3s ease-in-out infinite",
                "draw-rule": "draw-rule 700ms ease-out forwards",
                "stamp-in": "stamp-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                "fade-up": "fade-up 600ms ease-out forwards",
                shimmer: "shimmer 2.4s linear infinite",
                breathe: "breathe 6s ease-in-out infinite",
                "cursor-blink": "cursor-blink 1.1s steps(2, end) infinite",
                drift: "drift 60s ease-in-out infinite",
                twinkle: "twinkle 3.5s ease-in-out infinite",
                "ember-glow": "ember-glow 4s ease-in-out infinite",
            },
            keyframes: {
                marquee: {
                    "0%": {transform: "translateX(0%)"},
                    "100%": {transform: "translateX(-50%)"},
                },
                "yield-tick": {
                    "0%, 100%": {opacity: "0.85"},
                    "50%": {opacity: "1"},
                },
                "draw-rule": {
                    "0%": {transform: "scaleX(0)", transformOrigin: "left"},
                    "100%": {transform: "scaleX(1)", transformOrigin: "left"},
                },
                "stamp-in": {
                    "0%": {transform: "scale(1.6) rotate(-8deg)", opacity: "0"},
                    "60%": {transform: "scale(0.95) rotate(-1.2deg)", opacity: "1"},
                    "100%": {transform: "scale(1) rotate(-1.5deg)", opacity: "1"},
                },
                "fade-up": {
                    "0%": {transform: "translateY(8px)", opacity: "0"},
                    "100%": {transform: "translateY(0)", opacity: "1"},
                },
                shimmer: {
                    "0%": {backgroundPosition: "-200% 0"},
                    "100%": {backgroundPosition: "200% 0"},
                },
                breathe: {
                    "0%, 100%": {opacity: "0.5", transform: "scale(1)"},
                    "50%": {opacity: "0.8", transform: "scale(1.04)"},
                },
                "cursor-blink": {
                    "0%, 100%": {opacity: "1"},
                    "50%": {opacity: "0"},
                },
                drift: {
                    "0%, 100%": {transform: "translate(0, 0)"},
                    "33%": {transform: "translate(8px, -6px)"},
                    "66%": {transform: "translate(-6px, 4px)"},
                },
                twinkle: {
                    "0%, 100%": {opacity: "0.3"},
                    "50%": {opacity: "1"},
                },
                "ember-glow": {
                    "0%, 100%": {boxShadow: "0 0 12px rgba(242, 163, 65, 0.18)"},
                    "50%": {boxShadow: "0 0 24px rgba(242, 163, 65, 0.36)"},
                },
            },
            backgroundImage: {
                "scanlines":
                    "repeating-linear-gradient(0deg, rgba(232, 229, 221, 0.025) 0px, rgba(232, 229, 221, 0.025) 1px, transparent 1px, transparent 4px)",
                "ember":
                    "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(242, 163, 65, 0.08), transparent)",
            },
            transitionTimingFunction: {
                editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
                spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            },
        },
    },
    plugins: [],
};

export default config;
