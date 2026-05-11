"use client";

import {useMemo} from "react";

interface Props {
    data: number[];
    width?: number;
    height?: number;
    className?: string;
}

/**
 * Inline reputation trajectory. Path-only SVG, sized to wrap its
 * container. Min/max scaling computed from data. End value is marked
 * with a small amber dot — the "now" anchor.
 */
export function ReputationSparkline({data, width = 360, height = 80, className}: Props) {
    const {pathD, areaD, endX, endY} = useMemo(() => {
        if (data.length < 2) {
            return {pathD: "", areaD: "", endX: 0, endY: 0};
        }
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = Math.max(max - min, 1);
        const stepX = width / (data.length - 1);
        const padY = 6;
        const usableH = height - padY * 2;

        const toY = (v: number) => padY + (1 - (v - min) / range) * usableH;
        const points = data.map((v, i) => ({x: i * stepX, y: toY(v)}));
        const path = points
            .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
            .join(" ");
        const area = `${path} L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;
        const last = points[points.length - 1];
        return {pathD: path, areaD: area, endX: last.x, endY: last.y};
    }, [data, width, height]);

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height={height}
            preserveAspectRatio="none"
            className={className}
            aria-hidden
        >
            <defs>
                <linearGradient id="rep-area" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#F2A341" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#F2A341" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaD} fill="url(#rep-area)" />
            <path
                d={pathD}
                fill="none"
                stroke="#F2A341"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {endX > 0 && (
                <circle cx={endX} cy={endY} r="3" fill="#F2A341">
                    <animate
                        attributeName="r"
                        from="3"
                        to="6"
                        dur="2s"
                        repeatCount="indefinite"
                    />
                    <animate
                        attributeName="opacity"
                        from="1"
                        to="0"
                        dur="2s"
                        repeatCount="indefinite"
                    />
                </circle>
            )}
            {endX > 0 && <circle cx={endX} cy={endY} r="2.4" fill="#F2A341" />}
        </svg>
    );
}
