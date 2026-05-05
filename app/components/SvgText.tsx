import React from "react";
import fustatData from "./fustat-data.json";

type FontWeight = keyof typeof fustatData;

interface SvgTextProps {
    text: string;
    weight?: FontWeight;
    height?: number;
    className?: string;
    lineHeight?: number;
    align?: "left" | "center" | "right";
}

export function SvgText({
    text,
    weight = "500",
    height = 24,
    className = "",
    lineHeight = 1.5,
    align = "left",
}: SvgTextProps) {

    const font = fustatData[weight];

    if (!font) {
        console.warn(`[SvgText] Missing weight ${weight}! Falling back to span.`);
        return <span className={className}>{text}</span>;
    }

    const BASE_FONT_SIZE = 24;
    const VERTICAL_SPACING = BASE_FONT_SIZE * lineHeight;
    const glyphMap = font.glyphs as Record<string, { path: string; width: number }>;
    const kerningTable = font.kerning as Record<string, number>;

    // Pass 1: collect per-line glyph entries and widths
    type GlyphEntry = { path: string; x: number; lineY: number };
    const lineEntries: GlyphEntry[][] = [[]];
    const lineWidths: number[] = [];
    let currentX = 0;
    let currentLineY = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '\r') continue;

        if (char === '\n') {
            lineWidths.push(currentX);
            currentX = 0;
            currentLineY += VERTICAL_SPACING;
            lineEntries.push([]);
            continue;
        }

        const glyph = glyphMap[char];
        if (!glyph) {
            currentX += glyphMap[" "]?.width || 6;
            continue;
        }

        lineEntries[lineEntries.length - 1].push({ path: glyph.path, x: currentX, lineY: currentLineY });

        let kerning = 0;
        if (nextChar && nextChar !== '\n' && nextChar !== '\r') {
            kerning = kerningTable[char + nextChar] || 0;
        }

        currentX += glyph.width + kerning;
    }
    lineWidths.push(currentX);

    const totalWidth = Math.max(...lineWidths, 0);
    const totalHeight = currentLineY + BASE_FONT_SIZE;

    // Pass 2: render with per-line alignment offsets
    const paths: React.ReactNode[] = [];
    lineEntries.forEach((line, li) => {
        const lineWidth = lineWidths[li];
        const xOffset =
            align === "center" ? (totalWidth - lineWidth) / 2 :
            align === "right" ? totalWidth - lineWidth : 0;
        line.forEach(({ path, x, lineY }, gi) => {
            paths.push(
                <path
                    key={`${li}-${gi}`}
                    d={path}
                    transform={`translate(${x + xOffset}, ${lineY})`}
                />
            );
        });
    });

    const scale = height / BASE_FONT_SIZE;
    const containerWidth = totalWidth * scale;
    const containerHeight = totalHeight * scale;

    return (
        <span
            className={`relative shrink-0 flex items-center justify-center ${className}`}
            style={{
                height: `${containerHeight}px`,
                width: `${containerWidth}px`,
                display: 'inline-flex'
            }}
        >
            <span
                className="opacity-0 absolute inset-0 select-text overflow-hidden z-10"
                style={{ whiteSpace: 'pre-wrap' }}
            >
                {text}
            </span>

            <svg
                viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                height="100%"
                width="100%"
                className="fill-current pointer-events-none overflow-visible"
                aria-hidden="true"
            >
                {paths}
            </svg>
        </span>
    );
}