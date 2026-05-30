"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import fustatData from "./fustat-data.json";
import {
    BASE_FONT_SIZE,
    SUP_SCALE,
    type CharEntry,
    type GlyphMap,
    type KernMap,
    layoutGlyphs,
    softWrap,
} from "./svgTextLayout";

type FontWeight = keyof typeof fustatData;

export type SvgTextSegment = { text: string; color?: string };

// Semantic tag the outer wrapper renders as. Defaults to `span`. Pass `h1`,
// `h2`, `h3` for crawler / accessibility heading hierarchy — Tailwind preflight
// neutralises heading default styles + we force `display: inline-flex` via
// inline style, so the wrapper still lays out identically regardless of tag.
// The opacity-0 mirror span inside carries the actual text content, which is
// what screen readers and crawlers read as the heading's accessible name.
export type SvgTextAs = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";

interface SvgTextProps {
    text?: string;
    // When provided, overrides `text`. Each segment can have its own color.
    // Uncolored segments inherit fill-current from the SVG container.
    segments?: SvgTextSegment[];
    weight?: FontWeight;
    height?: number;
    className?: string;
    lineHeight?: number;
    align?: "left" | "center" | "right" | "justify";
    // Superscript characters appended at the end of the last line (e.g. "1", "2", "3").
    // Rendered at 55% scale, raised to the top of the line.
    superscript?: string;
    superscriptColor?: string;
    // Explicit max width in px for word-wrap. When omitted, the component measures
    // its parent's content-box width on mount and wraps to that. Pass Infinity to
    // disable wrapping entirely (only explicit \n break lines).
    maxWidth?: number;
    // Semantic wrapper tag. See SvgTextAs above.
    as?: SvgTextAs;
}

// Measure parent's content-box width on mount + on resize. Only when no
// explicit maxWidth was passed.
function useParentWidth(containerRef: React.RefObject<HTMLElement | null>, maxWidth: number | undefined) {
    const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
    useLayoutEffect(() => {
        if (maxWidth != null) return;
        const el = containerRef.current;
        const parent = el?.parentElement;
        if (!parent) return;
        const measure = () => {
            const w = parent.clientWidth;
            if (w > 0) setMeasuredWidth(w);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(parent);
        return () => ro.disconnect();
    }, [containerRef, maxWidth]);
    return measuredWidth;
}

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
    maxWidth,
    as = "span",
}: SvgTextProps) {
    const containerRef = useRef<HTMLElement>(null);
    const measuredWidth = useParentWidth(containerRef, maxWidth);

    const font = fustatData[weight];

    if (!font) {
        console.warn(`[SvgText] Missing weight ${weight}! Falling back to span.`);
        const plainText = segments ? segments.map(s => s.text).join("") : text;
        const FallbackTag = as as React.ElementType;
        return <FallbackTag ref={containerRef as React.Ref<HTMLElement>} className={className}>{plainText}</FallbackTag>;
    }

    const glyphMap = font.glyphs as GlyphMap;
    const kerningTable = font.kerning as KernMap;

    // Resolve wrap budget in glyph units. Explicit prop wins; otherwise measured
    // parent width (post-mount). First render before measurement: Infinity.
    const scaleEarly = height / BASE_FONT_SIZE;
    const effectivePxWidth = maxWidth ?? measuredWidth ?? Infinity;
    const maxGlyphWidth = effectivePxWidth === Infinity ? Infinity : effectivePxWidth / scaleEarly;

    // Flatten segments (or plain text) into a char+color sequence
    const inputSegments: SvgTextSegment[] = segments ?? [{ text, color: undefined }];
    const rawChars: CharEntry[] = [];
    for (const seg of inputSegments) {
        for (const char of seg.text) {
            rawChars.push({ char, color: seg.color });
        }
    }

    const chars = softWrap(rawChars, glyphMap, kerningTable, maxGlyphWidth);
    const plainText = chars.map(c => c.char).join("");

    const { lineEntries, lineWidths, totalWidth, totalHeight, currentLineY, supGlyphs } =
        layoutGlyphs(chars, glyphMap, kerningTable, lineHeight, superscript);

    // Render main glyphs with per-line alignment offsets
    const paths: React.ReactNode[] = [];
    lineEntries.forEach((line, li) => {
        const lineWidth = lineWidths[li];
        const isLastLine = li === lineEntries.length - 1;

        // Justify: widen inter-word gaps so line fills totalWidth. Skip last line
        // (standard typographic convention — final line stays left-aligned).
        if (align === "justify" && !isLastLine && line.length > 1) {
            const spaceCount = line.reduce((n, e) => n + (e.char === " " ? 1 : 0), 0);
            if (spaceCount > 0 && totalWidth > lineWidth) {
                const extra = (totalWidth - lineWidth) / spaceCount;
                let spacesSeen = 0;
                line.forEach(({ path, x, lineY, color, char }, gi) => {
                    paths.push(
                        <path
                            key={`${li}-${gi}`}
                            d={path}
                            fill={color ?? undefined}
                            transform={`translate(${x + spacesSeen * extra}, ${lineY})`}
                        />
                    );
                    if (char === " ") spacesSeen++;
                });
                return;
            }
        }

        const xOffset = lineOffset(align, totalWidth, lineWidth);
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

    // Superscript glyphs at 55% scale, sitting at the top of the last line.
    if (supGlyphs.length > 0) {
        const lastLineIdx = lineEntries.length - 1;
        const lastLineWidth = lineWidths[lastLineIdx];
        const xOffset = lineOffset(align, totalWidth, lastLineWidth);
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

    const Tag = as as React.ElementType;
    return (
        <Tag
            ref={containerRef as React.Ref<HTMLElement>}
            className={`relative flex items-center justify-center ${className}`}
            style={{
                height: `${containerHeight}px`,
                width: `${containerWidth}px`,
                // Force inline-flex so layout is identical regardless of the
                // semantic tag (h1/h2/etc. default to block; override here).
                display: 'inline-flex',
                // Headings ship with default browser margins under some UA
                // sheets; null them out so the wrapper truly behaves like the
                // original span. Tailwind preflight handles this for h1-h6 but
                // not for `p`, hence the inline override.
                margin: 0,
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
        </Tag>
    );
}

function lineOffset(align: "left" | "center" | "right" | "justify", totalWidth: number, lineWidth: number): number {
    if (align === "center") return (totalWidth - lineWidth) / 2;
    if (align === "right") return totalWidth - lineWidth;
    return 0;
}
