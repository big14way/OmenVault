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
                ink: "#0F1419",
                "ink-mute": "#5A6770",
                paper: "#FAF7F2",
                "paper-line": "#E5DFD3",
                twilight: "#1E1B4B",
                forest: "#1B5E3F", // YES
                crimson: "#9B2C2C", // NO
                terracotta: "#C04A2D", // CTA
            },
            fontFamily: {
                display: ["'Instrument Serif'", "serif"],
                sans: ["Geist", "ui-sans-serif", "system-ui"],
                mono: ["'Geist Mono'", "ui-monospace", "monospace"],
            },
        },
    },
    plugins: [],
};

export default config;
