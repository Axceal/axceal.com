import React from "react";
import fustatData from "./fustat-data.json";

type FontWeight = keyof typeof fustatData;

interface SvgTextProps {
    text: string;
    weight?: FontWeight;
    height?: number;
    className?: string;
    lineHeight?: number;
}

export function SvgText({
    text,
    weight = "500",
    height = 24,
    className = "",
    lineHeight = 1.3

}: SvgTextProps) {

    const font = fustatData[weight];

    // 2. THEN run the console logs
    console.log(`[SvgText] Rendering text: "${text}"`);
    console.log(`[SvgText] Requested Weight: ${weight}`);
    console.log(`[SvgText] Available Weights in JSON:`, Object.keys(fustatData));

    // 3. THEN check if the font exists
    if (!font) {
        console.warn(`[SvgText] Missing weight ${weight}! Falling back to span.`);
        return <span className={className}>{text}</span>;
    }

    let currentX = 0;
    let currentY = 0;
    let maxWidth = 0;

    const BASE_FONT_SIZE = 24;
    const VERTICAL_SPACING = BASE_FONT_SIZE * lineHeight;

    const paths: React.ReactNode[] = [];

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        // --- FIX 1: Ignore Windows Carriage Returns entirely ---
        if (char === '\r') continue;

        if (char === '\n') {
            maxWidth = Math.max(maxWidth, currentX);
            currentX = 0;
            currentY += VERTICAL_SPACING;
            continue;
        }

        const glyphs = font.glyphs as Record<string, { path: string; width: number }>;
        const glyph = glyphs[char];

        if (!glyph) {
            currentX += glyphs[" "]?.width || 6;
            continue;
        }

        paths.push(
            <path
                key={`${i}-${char}`}
                d={glyph.path}
                transform={`translate(${currentX}, ${currentY})`}
            />
        );

        let kerning = 0;
        if (nextChar && nextChar !== '\n' && nextChar !== '\r') {
            const pair = char + nextChar;
            const kerningTable = font.kerning as Record<string, number>;
            kerning = kerningTable[pair] || 0;
        }

        currentX += glyph.width + kerning;
    }

    // --- FIX 2: Ensure the longest line is ALWAYS captured, even if it has no \n after it ---
    const totalWidth = Math.max(maxWidth, currentX);
    const totalHeight = currentY + BASE_FONT_SIZE;

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
                className="fill-current pointer-events-none"
                aria-hidden="true"
            >
                {paths}
            </svg>
        </span>
    );
}