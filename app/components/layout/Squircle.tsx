"use client";
import { useRef, useState, useEffect, useMemo } from "react";
import { getSvgPath } from "figma-squircle";

export interface SquircleProps {
    /** Corner radius in px, like CSS border-radius. Default: 24 */
    borderRadius?: number;
    /**
     * Squircleness % (0–100), like Figma's corner smoothing slider.
     *   0   → identical to CSS rounded rect (circular arc)
     *   60  → classic iOS squircle  (default)
     *   100 → maximum smoothing
     */
    smoothing?: number;
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    /** Render as this element. Default: "div" */
    as?: React.ElementType;
    onClick?: React.MouseEventHandler;
    // Allow callers to pass framer-motion props (initial, animate, etc.) and
    // standard HTML attributes (type, aria-*, etc.) through to the rendered tag.
    [key: string]: unknown;
}

export function Squircle({
    borderRadius = 24,
    smoothing = 60,
    children,
    className = "",
    style,
    as: Tag = "div",
    onClick,
    ...rest
}: SquircleProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        // Grab size synchronously on mount so clip-path is ready on first paint
        const { width, height } = el.getBoundingClientRect();
        if (width > 0 && height > 0) setDims({ w: width, h: height });
        const ro = new ResizeObserver(([entry]) => {
            const box = entry.borderBoxSize?.[0];
            if (box) setDims({ w: box.inlineSize, h: box.blockSize });
            else setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const clipPath = useMemo(() => {
        if (dims.w <= 0 || dims.h <= 0) return undefined;
        // Cap radius only when squircle arms would exceed the half-side budget.
        // arm length = (1 + smoothing) × radius; cap so arms ≤ halfMin.
        const halfMin = Math.min(dims.w, dims.h) / 2;
        const maxRadius = halfMin / (1 + smoothing / 100);
        const effectiveRadius = Math.min(borderRadius, maxRadius);
        const d = getSvgPath({
            width: dims.w,
            height: dims.h,
            cornerRadius: effectiveRadius,
            cornerSmoothing: smoothing / 100,
            preserveSmoothing: true,
        });
        return `path("${d}")`;
    }, [dims, borderRadius, smoothing]);

    return (
        <Tag
            ref={ref}
            onClick={onClick}
            style={{ clipPath, ...style }}
            className={className}
            {...rest}
        >
            {children}
        </Tag>
    );
}
