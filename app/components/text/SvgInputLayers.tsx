"use client";
import React from "react";
import { BASE, type GlyphPath } from "./svgInputHelpers";

// Two SVG layers used by SvgInput: the empty/placeholder layer and the
// typed-text/cursor layer. Extracted to keep SvgInput.tsx focused on input
// state machinery (cursor index, focus, key handling) rather than render.

export function PlaceholderLayer(props: {
    phPaths: GlyphPath[];
    phAlignOffset: number;
    alignOffset: number;
    viewWidth: number;
    height: number;
    scale: number;
    focused: boolean;
    blink: boolean;
}) {
    const { phPaths, phAlignOffset, alignOffset, viewWidth, height, scale, focused, blink } = props;
    return (
        <svg
            viewBox={`0 0 ${Math.max(viewWidth, 1)} ${BASE}`}
            height={height}
            width={Math.max(viewWidth, 1) * scale}
            preserveAspectRatio="xMinYMid meet"
            className="fill-current opacity-40"
            aria-hidden="true"
            style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
        >
            <g transform={phAlignOffset > 0 ? `translate(${phAlignOffset},0)` : undefined}>
                {phPaths.map((g, i) => (
                    <path key={i} d={g.d} transform={`translate(${g.x},0)`} />
                ))}
            </g>
            {focused && blink && (
                <line
                    x1={alignOffset} y1={1} x2={alignOffset} y2={BASE - 1}
                    stroke="currentColor"
                    strokeWidth={1.5 / scale}
                    strokeLinecap="round"
                    opacity={0.6}
                />
            )}
        </svg>
    );
}

export function TextLayer(props: {
    paths: GlyphPath[];
    type: "text" | "email" | "password";
    hasBullet: boolean;
    value: string;
    bulletSpacingFU: number;
    bulletRadiusFU: number;
    cursorXFU: number;
    alignOffset: number;
    viewLeft: number;
    viewWidth: number;
    height: number;
    scale: number;
    focused: boolean;
    blink: boolean;
}) {
    const {
        paths, type, hasBullet, value, bulletSpacingFU, bulletRadiusFU,
        cursorXFU, alignOffset, viewLeft, viewWidth, height, scale, focused, blink,
    } = props;
    return (
        <svg
            // viewBox scrolls horizontally: left edge starts at scrollUnits,
            // width covers exactly the clip area in font-units.
            viewBox={`${viewLeft} 0 ${viewWidth} ${BASE}`}
            height={height}
            width={viewWidth * scale}
            preserveAspectRatio="xMinYMid meet"
            className="fill-current"
            aria-hidden="true"
            style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
        >
            <g transform={alignOffset > 0 ? `translate(${alignOffset},0)` : undefined}>
                {type === "password" && !hasBullet ? (
                    // Fallback bullet circles — no glyph for ●
                    [...value].map((_, i) => (
                        <circle
                            key={i}
                            cx={i * bulletSpacingFU + bulletRadiusFU}
                            cy={BASE / 2}
                            r={bulletRadiusFU}
                        />
                    ))
                ) : (
                    paths.map((g, i) => (
                        <path key={i} d={g.d} transform={`translate(${g.x},0)`} />
                    ))
                )}

                {/* Cursor line — same coordinate space as the glyphs */}
                {focused && blink && (
                    <line
                        x1={cursorXFU} y1={1}
                        x2={cursorXFU} y2={BASE - 1}
                        stroke="currentColor"
                        strokeWidth={1.5 / scale}
                        strokeLinecap="round"
                    />
                )}
            </g>
        </svg>
    );
}
