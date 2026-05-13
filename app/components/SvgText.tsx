import React from "react";
import fustatData from "./fustat-data.json";

type FontWeight = keyof typeof fustatData;

export type SvgTextSegment = { text: string; color?: string };

interface SvgTextProps {
    text?: string;
    // When provided, overrides `text`. Each segment can have its own color.
    // Uncolored segments inherit fill-current from the SVG container.
    segments?: SvgTextSegment[];
    weight?: FontWeight;
    height?: number;
    className?: string;
    lineHeight?: number;
    align?: "left" | "center" | "right";
    // Superscript characters appended at the end of the last line (e.g. "1", "2", "3").
    // Rendered at 55% scale, raised to the top of the line — no external <sup> needed.
    superscript?: string;
    superscriptColor?: string;
}

// Superscript scale relative to BASE_FONT_SIZE
const SUP_SCALE = 0.6;

export function SvgText({
    text = "",
    segments,
    weight = "500",
    height = 24,
    className = "",
    lineHeight = 1.5,
    align = "left",
    superscript,
    superscriptColor,
}: SvgTextProps) {

    const font = fustatData[weight];

    if (!font) {
        console.warn(`[SvgText] Missing weight ${weight}! Falling back to span.`);
        const plainText = segments ? segments.map(s => s.text).join("") : text;
        return <span className={className}>{plainText}</span>;
    }

    const BASE_FONT_SIZE = 24;
    const VERTICAL_SPACING = BASE_FONT_SIZE * lineHeight;
    const glyphMap = font.glyphs as Record<string, { path: string; width: number }>;
    const kerningTable = font.kerning as Record<string, number>;

    // Flatten segments (or plain text) into a char+color sequence
    const inputSegments: SvgTextSegment[] = segments ?? [{ text, color: undefined }];
    type CharEntry = { char: string; color?: string };
    const chars: CharEntry[] = [];
    for (const seg of inputSegments) {
        for (const char of seg.text) {
            chars.push({ char, color: seg.color });
        }
    }
    const plainText = chars.map(c => c.char).join("");

    // Pass 1: collect per-line glyph entries and widths
    type GlyphEntry = { path: string; x: number; lineY: number; color?: string };
    const lineEntries: GlyphEntry[][] = [[]];
    const lineWidths: number[] = [];
    let currentX = 0;
    let currentLineY = 0;

    for (let i = 0; i < chars.length; i++) {
        const { char, color } = chars[i];
        const nextChar = chars[i + 1]?.char;

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

        lineEntries[lineEntries.length - 1].push({ path: glyph.path, x: currentX, lineY: currentLineY, color });

        let kerning = 0;
        if (nextChar && nextChar !== '\n' && nextChar !== '\r') {
            kerning = kerningTable[char + nextChar] || 0;
        }

        currentX += glyph.width + kerning;
    }
    lineWidths.push(currentX);

    // Superscript: compute glyph positions relative to line start, after last char.
    // Must happen before totalWidth so alignment in pass 2 includes the sup width.
    const lastLineIdx = lineEntries.length - 1;
    type SupGlyph = { path: string; relX: number };
    const supGlyphs: SupGlyph[] = [];

    if (superscript) {
        let supX = lineWidths[lastLineIdx] + 2; // 2-unit gap after main text
        for (const char of superscript) {
            const glyph = glyphMap[char];
            if (!glyph) continue;
            supGlyphs.push({ path: glyph.path, relX: supX });
            supX += glyph.width * SUP_SCALE;
        }
        // Expand last line width so alignment math treats sup as part of the line
        lineWidths[lastLineIdx] = supX;
    }

    const totalWidth = Math.max(...lineWidths, 0);
    const totalHeight = currentLineY + BASE_FONT_SIZE;

    // Pass 2: render main glyphs with per-line alignment offsets
    const paths: React.ReactNode[] = [];
    lineEntries.forEach((line, li) => {
        const lineWidth = lineWidths[li];
        const xOffset =
            align === "center" ? (totalWidth - lineWidth) / 2 :
                align === "right" ? totalWidth - lineWidth : 0;
        line.forEach(({ path, x, lineY, color }, gi) => {
            paths.push(
                <path
                    key={`${li}-${gi}`}
                    d={path}
                    fill={color ?? undefined}
                    transform={`translate(${x + xOffset}, ${lineY})`}
                />
            );
        });
    });

    // Render superscript glyphs at 55% scale, sitting at the top of the last line.
    // SVG transform order: scale first (around origin), then translate — so the glyph
    // ends up at (relX + xOffset, lastLineY) with height BASE_FONT_SIZE * SUP_SCALE.
    if (supGlyphs.length > 0) {
        const lastLineWidth = lineWidths[lastLineIdx];
        const xOffset =
            align === "center" ? (totalWidth - lastLineWidth) / 2 :
                align === "right" ? totalWidth - lastLineWidth : 0;
        supGlyphs.forEach(({ path, relX }, i) => {
            paths.push(
                <path
                    key={`sup-${i}`}
                    d={path}
                    fill={superscriptColor ?? undefined}
                    transform={`translate(${relX + xOffset}, ${currentLineY}) scale(${SUP_SCALE})`}
                />
            );
        });
    }

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
                {plainText}{superscript}
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
