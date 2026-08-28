"use client";
import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import fustatData from "./fustat-data.json";
import { type FontWeight, type GlyphMap, type KernMap, BASE, BLINK_MS, buildGlyphs } from "./svgInputHelpers";
import { PlaceholderLayer, TextLayer } from "./SvgInputLayers";

export interface SvgInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: "text" | "email" | "password";
    weight?: FontWeight;
    /** Desired render height in px — same unit as SvgText's `height` prop */
    height?: number;
    /** Extra letter spacing between characters in px */
    letterSpacing?: number;
    /** Tailwind/CSS classes applied to the outer pill container */
    className?: string;
    id?: string;
    required?: boolean;
    readOnly?: boolean;
    autoComplete?: string;
    align?: "left" | "center" | "right";
    placeholderOpacity?: number;
    placeholderColor?: string;
    /** Slot to the right of the text area, e.g. a Send OTP button */
    rightSlot?: React.ReactNode;
    /** Called when the hidden input gains focus */
    onFocus?: () => void;
    /** Called when the hidden input loses focus */
    onBlur?: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    /** Custom typing indicator height scale. Default is 1.0 (matches font height) */
    cursorHeightScale?: number;
    /** Custom typing indicator stroke width. Default is 1.5 */
    cursorWidth?: number;
    /** Custom typing indicator color. Default is "currentColor" */
    cursorColor?: string;
}

// Tracks the clip element's pixel width via ResizeObserver. Pulled out so the
// render path reads a state value instead of a ref (necessary for the SVG
// viewBox math to re-run when the parent flexes).
function useClipWidth(ref: React.RefObject<HTMLDivElement | null>) {
    const [w, setW] = useState(200);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        setW(el.offsetWidth);
        const ro = new ResizeObserver(() => setW(el.offsetWidth));
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);
    return w;
}

function useBlink(focused: boolean, cursorIdx: number) {
    const [blink, setBlink] = useState(true);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!focused) { setBlink(true); return; }
        setBlink(true);
        const t = setInterval(() => setBlink(b => !b), BLINK_MS);
        return () => clearInterval(t);
    }, [focused, cursorIdx]);
    return [blink, setBlink] as const;
}

export function SvgInput({
    value,
    onChange,
    placeholder = "",
    type = "text",
    weight = "600",
    height = 16,
    letterSpacing = 0,
    className = "",
    id,
    required,
    readOnly,
    autoComplete,
    align = "left",
    placeholderOpacity,
    placeholderColor,
    rightSlot,
    onFocus: onFocusProp,
    onBlur: onBlurProp,
    onKeyDown: onKeyDownProp,
    cursorHeightScale = 1.0,
    cursorWidth = 1.5,
    cursorColor = "currentColor",
}: SvgInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const clipRef = useRef<HTMLDivElement>(null);
    const [focused, setFocused] = useState(false);
    const [cursorIdx, setCursorIdx] = useState(0);
    // How many font-units to shift the SVG leftward to keep the cursor visible.
    const [scrollUnits, setScrollUnits] = useState(0);
    // Distinguishes click-focus from tab-focus so we don't misposition the cursor.
    const isMouseFocusRef = useRef(false);

    const clipWidth = useClipWidth(clipRef);
    const [blink, setBlink] = useBlink(focused, cursorIdx);

    // ── Font data ─────────────────────────────────────────────────────────────
    const font = fustatData[weight];
    const glyphs = (font?.glyphs ?? {}) as GlyphMap;
    const kern = (font?.kerning ?? {}) as KernMap;

    // ── Display string ────────────────────────────────────────────────────────
    const BULLET = "●";  // U+25CF
    const hasBullet = !!glyphs[BULLET];
    const display = type === "password" ? BULLET.repeat(value.length) : value;

    // scale: font-units → CSS pixels
    const scale = height / BASE;
    const letterSpacingFU = letterSpacing / scale;

    // ── Glyph geometry ────────────────────────────────────────────────────────
    const { paths, xPositions, totalWidth } = buildGlyphs(display, glyphs, kern, letterSpacingFU);
    const { paths: phPaths, totalWidth: phWidth } = buildGlyphs(placeholder, glyphs, kern, 0);

    // ── Password bullet fallback sizes (font-space units) ────────────────────
    const BULLET_R_PX = height * 0.22;
    const BULLET_SPACING_PX = BULLET_R_PX * 2.8;
    const BULLET_R_FU = BULLET_R_PX / scale;
    const BULLET_SPACING_FU = BULLET_SPACING_PX / scale;

    // ── Cursor X in font-units (right BEFORE character cursorIdx) ────────────
    let cursorXFU: number;
    if (type === "password" && !hasBullet) {
        cursorXFU = cursorIdx * BULLET_SPACING_FU;
    } else {
        cursorXFU = xPositions[Math.min(cursorIdx, xPositions.length - 1)] ?? 0;
    }

    // ── Scroll-to-cursor (in font-units) ─────────────────────────────────────
    useEffect(() => {
        if (!clipRef.current) return;
        const clipWidthFU = clipRef.current.offsetWidth / scale;
        if (clipWidthFU <= 0) return;
        // Cap padding to at most half the visible width, preventing over-correction bounce loops
        const padFU = Math.min(4 / scale, clipWidthFU / 2);
        if (cursorXFU - scrollUnits > clipWidthFU - padFU) {
            setScrollUnits(cursorXFU - clipWidthFU + padFU);
        } else if (cursorXFU - scrollUnits < 0) {
            setScrollUnits(Math.max(0, cursorXFU - padFU));
        }
    }, [cursorXFU, scrollUnits, scale]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (value.length === 0) { setCursorIdx(0); setScrollUnits(0); }
    }, [value.length]);

    // Only sync for nav keys — Backspace/Delete are handled by onChange.
    const syncAfterNav = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
        setTimeout(() => {
            setBlink(true);
            const pos = inputRef.current?.selectionStart;
            if (pos !== null && pos !== undefined) setCursorIdx(pos);
        }, 0);
    }, [setBlink]);

    // After React re-renders a controlled input the browser may reset
    // selectionStart to value.length. Restore it synchronously before paint.
    useLayoutEffect(() => {
        const el = inputRef.current;
        if (!el || document.activeElement !== el) return;
        el.setSelectionRange(cursorIdx, cursorIdx);
    }, [value, cursorIdx]);

    // ── SVG content width (font-units) ────────────────────────────────────────
    const CARET_EXTRA = 2;
    const contentWidth = type === "password" && !hasBullet
        ? Math.max(value.length * BULLET_SPACING_FU + CARET_EXTRA, 1)
        : Math.max(totalWidth + CARET_EXTRA, 1);

    const viewLeft = scrollUnits;
    const clipWidthFU = clipWidth / scale;
    const viewWidth = clipWidthFU > 0 ? clipWidthFU : contentWidth;

    const textWidthFU = type === "password" && !hasBullet ? value.length * BULLET_SPACING_FU : totalWidth;
    const alignOffset = computeAlign(align, viewWidth, textWidthFU);
    const phAlignOffset = computeAlign(align, viewWidth, phWidth);

    // ── Click-to-position: map click X to the closest glyph boundary ────────
    const handleContainerClick = (e: React.MouseEvent) => {
        inputRef.current?.focus();
        const rect = clipRef.current?.getBoundingClientRect();
        if (!rect || value.length === 0) return;
        const clickX = e.clientX - rect.left;
        const clickXFU = (clickX / scale) + scrollUnits;
        const adjustedClickXFU = clickXFU - alignOffset;

        let closest = 0;
        let minDist = Infinity;
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

    return (
        <div
            className={`relative flex items-center cursor-text select-none ${className}`}
            onClick={handleContainerClick}
        >
            {/* Hidden real <input> — all keyboard / IME / clipboard events go here */}
            <input
                ref={inputRef}
                id={id}
                // Always use type="text" on the hidden input so selectionStart /
                // setSelectionRange work reliably. For password we keep the
                // native type so autofill / password managers still work.
                type={type === "password" ? "password" : "text"}
                inputMode={type === "email" ? "email" : undefined}
                value={value}
                required={required}
                readOnly={readOnly}
                autoComplete={autoComplete ?? "off"}
                onChange={e => {
                    const newVal = e.target.value;
                    // Grab selectionStart synchronously — after onChange is
                    // called the DOM node may be reset by React.
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

            {/* SVG visual layer — clips horizontally, allows descenders below */}
            <div
                ref={clipRef}
                className="relative flex-1 pointer-events-none"
                style={{ height: `${height}px`, clipPath: `inset(-10px 0 -30px 0)` }}
            >
                {value.length === 0 && placeholder && (
                    <div className="absolute inset-0 pointer-events-none origin-center">
                        <PlaceholderLayer
                            phPaths={phPaths}
                            phAlignOffset={phAlignOffset}
                            alignOffset={alignOffset}
                            viewWidth={viewWidth}
                            height={height}
                            scale={scale}
                            focused={focused}
                            blink={blink}
                            cursorHeightScale={cursorHeightScale}
                            cursorWidth={cursorWidth}
                            cursorColor={cursorColor}
                            placeholderOpacity={placeholderOpacity}
                            placeholderColor={placeholderColor}
                        />
                    </div>
                )}
                {(value.length > 0 || (focused && value.length === 0 && !placeholder)) && (
                    <TextLayer
                        paths={paths}
                        type={type}
                        hasBullet={hasBullet}
                        value={value}
                        bulletSpacingFU={BULLET_SPACING_FU}
                        bulletRadiusFU={BULLET_R_FU}
                        cursorXFU={cursorXFU}
                        alignOffset={alignOffset}
                        viewLeft={viewLeft}
                        viewWidth={viewWidth}
                        height={height}
                        scale={scale}
                        focused={focused}
                        blink={blink}
                        cursorHeightScale={cursorHeightScale}
                        cursorWidth={cursorWidth}
                        cursorColor={cursorColor}
                    />
                )}
            </div>

            {rightSlot && (
                <div className="relative z-20 pointer-events-auto shrink-0 flex items-center">
                    {rightSlot}
                </div>
            )}
        </div>
    );
}

function computeAlign(align: "left" | "center" | "right", viewWidth: number, contentWidth: number): number {
    if (align === "center") return Math.max(0, (viewWidth - contentWidth) / 2);
    if (align === "right") return Math.max(0, viewWidth - contentWidth);
    return 0;
}
