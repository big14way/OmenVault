// Deterministic generative SVG sigils for agents.
// Same agent ID always produces the same sigil — geometric marks on Paper.

export type EmblemTone = "ink" | "forest" | "crimson" | "terracotta" | "twilight";

const TONE_MAP: Record<EmblemTone, string> = {
    ink: "#0F1419",
    forest: "#1B5E3F",
    crimson: "#9B2C2C",
    terracotta: "#C04A2D",
    twilight: "#1E1B4B",
};

function mulberry32(seed: number) {
    let s = seed >>> 0;
    return function () {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function emblemFor(agentId: number, tone: EmblemTone = "ink"): string {
    const rand = mulberry32(agentId * 9176 + 1);
    const stroke = TONE_MAP[tone];
    const size = 64;
    const cx = size / 2;
    const cy = size / 2;

    const variant = Math.floor(rand() * 5);
    const rotation = Math.floor(rand() * 360);
    const r1 = 14 + rand() * 10;
    const r2 = 4 + rand() * 8;
    const offset = rand() * 6 - 3;
    const sw = 1.2;

    let body = "";

    switch (variant) {
        case 0: {
            // Concentric arcs with a tick
            body = `
                <circle cx="${cx}" cy="${cy}" r="${r1}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
                <circle cx="${cx}" cy="${cy}" r="${r2}" fill="${stroke}"/>
                <line x1="${cx}" y1="${cy - r1 - 3}" x2="${cx}" y2="${cy - r1 + 3}" stroke="${stroke}" stroke-width="${sw}"/>
            `;
            break;
        }
        case 1: {
            // Triangle in circle
            const tr = r1 - 3;
            const a = (Math.PI * 2) / 3;
            const pts = [0, 1, 2]
                .map((i) => {
                    const ang = a * i - Math.PI / 2;
                    return `${cx + tr * Math.cos(ang)},${cy + tr * Math.sin(ang)}`;
                })
                .join(" ");
            body = `
                <circle cx="${cx}" cy="${cy}" r="${r1}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
                <polygon points="${pts}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
            `;
            break;
        }
        case 2: {
            // Cross-hairs square
            const sq = r1 - 1;
            body = `
                <rect x="${cx - sq}" y="${cy - sq}" width="${sq * 2}" height="${sq * 2}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
                <line x1="${cx - sq - 4}" y1="${cy}" x2="${cx + sq + 4}" y2="${cy}" stroke="${stroke}" stroke-width="${sw / 2}"/>
                <line x1="${cx}" y1="${cy - sq - 4}" x2="${cx}" y2="${cy + sq + 4}" stroke="${stroke}" stroke-width="${sw / 2}"/>
                <circle cx="${cx}" cy="${cy}" r="2.4" fill="${stroke}"/>
            `;
            break;
        }
        case 3: {
            // Quarter sweeps
            const rr = r1;
            body = `
                <path d="M ${cx - rr} ${cy} A ${rr} ${rr} 0 0 1 ${cx} ${cy - rr}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
                <path d="M ${cx + rr} ${cy} A ${rr} ${rr} 0 0 1 ${cx} ${cy + rr}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
                <circle cx="${cx + offset}" cy="${cy}" r="${r2 / 2}" fill="${stroke}"/>
            `;
            break;
        }
        default: {
            // Hex with center dot
            const hr = r1;
            const hx = (i: number) => cx + hr * Math.cos((Math.PI / 3) * i);
            const hy = (i: number) => cy + hr * Math.sin((Math.PI / 3) * i);
            const pts = [0, 1, 2, 3, 4, 5].map((i) => `${hx(i)},${hy(i)}`).join(" ");
            body = `
                <polygon points="${pts}" fill="none" stroke="${stroke}" stroke-width="${sw}"/>
                <circle cx="${cx}" cy="${cy}" r="${r2 / 1.4}" fill="${stroke}"/>
            `;
        }
    }

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <g transform="rotate(${rotation} ${cx} ${cy})">
                ${body}
            </g>
        </svg>
    `;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
