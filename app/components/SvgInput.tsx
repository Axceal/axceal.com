"use client";
import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import fustatData from "./fustat-data.json";

// ─── Types ────────────────────────────────────────────────────────────────────
type FontWeight = keyof typeof fustatData;
type GlyphMap = Record<string, { path: string; width: number }>;
type KernMap = Record<string, number>;

export interface SvgInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: "text" | "email" | "password";
    weight?: FontWeight;
    /** Desired render height in px — same unit as SvgText's `height` prop */
    height?: number;
    /** Tailwind/CSS classes applied to the outer pill container */
    className?: string;
    id?: string;
    required?: boolean;
    autoComplete?: string;
    align?: "left" | "center";
    /** Slot to the right of the text area, e.g. a Send OTP button */
    rightSlot?: React.ReactNode;
    /** Called when the hidden input gains focus */
    onFocus?: () => void;
    /** Called when the hidden input loses focus */
    onBlur?: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
// The Fustat glyph coordinate grid height — same BASE used by SvgText.tsx
const BASE = 24;
const BLINK_MS = 530;

// ─── Glyph helper ────────────────────────────────────────────────────────────
function buildGlyphs(
    text: string,
    glyphs: GlyphMap,
    kern: KernMap
): { paths: { d: string; x: number }[]; xPositions: number[]; totalWidth: number } {
    let x = 0;
    const paths: { d: string; x: number }[] = [];
    // xPositions[i] = left edge of character i in font-units.
    // xPositions[text.length] = right edge of the last character.
    const xPositions: number[] = [0];

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];
        const g = glyphs[char];

        if (!g) {
            const sw = glyphs[" "]?.width ?? 6;
            x += sw;
            xPositions.push(x);
            continue;
        }

        paths.push({ d: g.path, x });
        const k = next ? (kern[char + next] ?? 0) : 0;
        x += g.width + k;
        xPositions.push(x);
    }

    return { paths, xPositions, totalWidth: x };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SvgInput({
    value,
    onChange,
    placeholder = "",
    type = "text",
    weight = "600",
    height = 16,
    className = "",
    id,
    required,
    autoComplete,
    align = "left",
    rightSlot,
    onFocus: onFocusProp,
    onBlur: onBlurProp,
    onKeyDown: onKeyDownProp,
}: SvgInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const clipRef = useRef<HTMLDivElement>(null);
    const [focused, setFocused] = useState(false);
    const [cursorIdx, setCursorIdx] = useState(0);
    const [blink, setBlink] = useState(true);
    // How many font-units to shift the SVG leftward to keep the cursor visible.
    const [scrollUnits, setScrollUnits] = useState(0);
    // Distinguishes click-focus from tab-focus so we don't misposition the cursor.
    const isMouseFocusRef = useRef(false);

    // ── Blink ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!focused) { setBlink(true); return; }
        setBlink(true);
        const timer = setInterval(() => setBlink(b => !b), BLINK_MS);
        return () => clearInterval(timer);
    }, [focused, cursorIdx]);

    // ── Font data ─────────────────────────────────────────────────────────────
    const font = fustatData[weight];
    const glyphs = (font?.glyphs ?? {}) as GlyphMap;
    const kern = (font?.kerning ?? {}) as KernMap;

    // ── Display string ────────────────────────────────────────────────────────
    const BULLET = "●";  // U+25CF
    const hasBullet = !!glyphs[BULLET];
    const display = type === "password" ? BULLET.repeat(value.length) : value;

    // ── Glyph geometry ────────────────────────────────────────────────────────
    const { paths, xPositions, totalWidth } = buildGlyphs(display, glyphs, kern);
    const { paths: phPaths, totalWidth: phWidth } = buildGlyphs(placeholder, glyphs, kern);

    // scale: font-units → CSS pixels
    const scale = height / BASE;

    // ── Password bullet fallback sizes (font-space units) ────────────────────
    const BULLET_R_PX = height * 0.22;
    const BULLET_SPACING_PX = BULLET_R_PX * 2.8;
    // Convert to font-space so cursor can live alongside them
    const BULLET_R_FU = BULLET_R_PX / scale;
    const BULLET_SPACING_FU = BULLET_SPACING_PX / scale;

    // ── Cursor X in font-units ────────────────────────────────────────────────
    // The cursor sits right BEFORE character cursorIdx.
    // xPositions always has text.length+1 entries, so clamping is safe.
    let cursorXFU: number;
    if (type === "password" && !hasBullet) {
        // Bullet fallback: each bullet occupies BULLET_SPACING_FU horizontally
        cursorXFU = cursorIdx * BULLET_SPACING_FU;
    } else {
        cursorXFU = xPositions[Math.min(cursorIdx, xPositions.length - 1)] ?? 0;
    }

    // ── Scroll-to-cursor (in font-units) ─────────────────────────────────────
    useEffect(() => {
        if (!clipRef.current) return;
        const clipWidthFU = clipRef.current.offsetWidth / scale;
        if (clipWidthFU <= 0) return; // Wait for real layout

        // Cap padding to at most half the visible width, preventing over-correction bounce loops
        const padFU = Math.min(4 / scale, clipWidthFU / 2); 

        if (cursorXFU - scrollUnits > clipWidthFU - padFU) {
            setScrollUnits(cursorXFU - clipWidthFU + padFU);
        } else if (cursorXFU - scrollUnits < 0) {
            setScrollUnits(Math.max(0, cursorXFU - padFU));
        }
    }, [cursorXFU, scrollUnits, scale]);

    // Reset scroll when cleared
    useEffect(() => {
        if (value.length === 0) { setCursorIdx(0); setScrollUnits(0); }
    }, [value.length]);

    // ── Cursor tracking ───────────────────────────────────────────────────────
    const syncAfterNav = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        // Only sync for navigation keys — Backspace/Delete are handled by onChange.
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
        // Wait one tick for the browser to move the caret, then read selectionStart.
        setTimeout(() => {
            setBlink(true);
            const pos = inputRef.current?.selectionStart;
            if (pos !== null && pos !== undefined) setCursorIdx(pos);
        }, 0);
    }, []);

    // After React re-renders a controlled input the browser may reset selectionStart
    // to value.length. Restore it synchronously before paint so the caret stays
    // where the user placed it (typing mid-string, arrow-key movement, clicks, etc.).
    useLayoutEffect(() => {
        const el = inputRef.current;
        if (!el || document.activeElement !== el) return;
        el.setSelectionRange(cursorIdx, cursorIdx);
    }, [value, cursorIdx]);

    // ── SVG content width (font-units) ────────────────────────────────────────
    // We need extra space on the right for the cursor caret when it's at the end.
    const CARET_EXTRA = 2; // font-units
    let contentWidth: number;
    if (type === "password" && !hasBullet) {
        contentWidth = Math.max(value.length * BULLET_SPACING_FU + CARET_EXTRA, 1);
    } else {
        contentWidth = Math.max(totalWidth + CARET_EXTRA, 1);
    }
    // Effective viewBox that accounts for horizontal scrolling
    const viewLeft = scrollUnits;
    const clipWidthFU = (clipRef.current?.offsetWidth ?? 200) / scale;
    const viewWidth = clipWidthFU > 0 ? clipWidthFU : contentWidth;

    const alignOffset = align === "center" ? Math.max(0, (viewWidth - (type === "password" && !hasBullet ? value.length * BULLET_SPACING_FU : totalWidth)) / 2) : 0;

    // ── Click-to-position: map click X to the closest glyph boundary ────────
    const handleContainerClick = (e: React.MouseEvent) => {
        inputRef.current?.focus();
        const rect = clipRef.current?.getBoundingClientRect();
        if (!rect || value.length === 0) return;

        const clickX = e.clientX - rect.left;
        const clickXFU = (clickX / scale) + scrollUnits;

        let closest = 0;
        let minDist = Infinity;
        const adjustedClickXFU = clickXFU - alignOffset;

        if (type === "password" && !hasBullet) {
            for (let i = 0; i <= value.length; i++) {
                const dist = Math.abs(i * BULLET_SPACING_FU - adjustedClickXFU);
                if (dist < minDist) { minDist = dist; closest = i; }
            }
        } else {
            for (let i = 0; i < xPositions.length; i++) {
                const dist = Math.abs(xPositions[i] - adjustedClickXFU);
                if (dist < minDist) { minDist = dist; closest = i; }
            }
        }

        setCursorIdx(closest);
        setBlink(true);
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div
            className={`relative flex items-center overflow-hidden cursor-text select-none ${className}`}
            onClick={handleContainerClick}
        >
            {/* Hidden real <input> — all keyboard / IME / clipboard events go here */}
            <input
                ref={inputRef}
                id={id}
                // Always use type="text" on the hidden input so selectionStart /
                // setSelectionRange work reliably. The real input is invisible —
                // only the SVG layer matters visually. For password we keep the
                // native type so autofill / password managers still work.
                type={type === "password" ? "password" : "text"}
                inputMode={type === "email" ? "email" : undefined}
                value={value}
                required={required}
                autoComplete={autoComplete ?? "off"}
                onChange={e => {
                    const newVal = e.target.value;
                    // Grab selectionStart synchronously from the event — after
                    // onChange is called the DOM node may be reset by React.
                    const pos = e.target.selectionStart ?? newVal.length;
                    onChange(newVal);
                    setCursorIdx(pos);
                    setBlink(true);
                }}
                onKeyDown={e => {
                    syncAfterNav(e);
                    onKeyDownProp?.(e);
                }}
                onMouseDown={() => { isMouseFocusRef.current = true; }}
                onFocus={() => {
                    setFocused(true);
                    if (!isMouseFocusRef.current) {
                        // Tab-focus: place cursor at the end
                        setCursorIdx(value.length);
                        setBlink(true);
                    }
                    isMouseFocusRef.current = false;
                    onFocusProp?.();
                }}
                onBlur={() => { setFocused(false); onBlurProp?.(); }}
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-text outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border-none"
                style={{ caretColor: "transparent", WebkitAppearance: "none" }}
                tabIndex={0}
            />

            {/* SVG visual layer — clips horizontally */}
            <div
                ref={clipRef}
                className="relative flex-1 overflow-hidden pointer-events-none"
                style={{ height: `${height}px` }}
            >
                {/* ── Placeholder SVG (shown when empty) ── */}
                {value.length === 0 && placeholder && (
                    <svg
                        viewBox={`0 0 ${Math.max(phWidth, 1)} ${BASE}`}
                        height={height}
                        width={Math.max(phWidth, 1) * scale}
                        preserveAspectRatio="xMinYMid meet"
                        className="fill-current opacity-40"
                        aria-hidden="true"
                        style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}
                    >
                        {phPaths.map((g, i) => (
                            <path key={i} d={g.d} transform={`translate(${g.x},0)`} />
                        ))}
                        {/* Cursor at position 0 when focused and empty */}
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
                )}

                {/* ── Typed text SVG ── */}
                {/* The cursor line lives INSIDE this SVG — same coordinate space,
                    so drift between cursor and glyphs is impossible by construction. */}
                {(value.length > 0 || (focused && value.length === 0 && !placeholder)) && (
                    <svg
                        /*
                         * viewBox scrolls horizontally: left edge starts at scrollUnits,
                         * width covers exactly the clip area in font-units.
                         * This is equivalent to shifting the SVG canvas left by scrollUnits.
                         */
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
                                        cx={i * BULLET_SPACING_FU + BULLET_R_FU}
                                        cy={BASE / 2}
                                        r={BULLET_R_FU}
                                    />
                                ))
                            ) : (
                                paths.map((g, i) => (
                                    <path key={i} d={g.d} transform={`translate(${g.x},0)`} />
                                ))
                            )}

                            {/* ── Cursor line — same coordinate space as the glyphs ── */}
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
                )}
            </div>

            {/* Right slot */}
            {rightSlot && (
                <div className="relative z-20 pointer-events-auto shrink-0 flex items-center">
                    {rightSlot}
                </div>
            )}
        </div>
    );
}
