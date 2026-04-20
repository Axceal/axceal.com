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
}

export function Squircle({
    borderRadius = 24,
    smoothing = 60,
    children,
    className = "",
    style,
    as: Tag = "div",
    onClick,
}: SquircleProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const clipPath = useMemo(() => {
        if (dims.w <= 0 || dims.h <= 0) return undefined;
        const d = getSvgPath({
            width: dims.w,
            height: dims.h,
            cornerRadius: borderRadius,
            cornerSmoothing: smoothing / 100, // figma-squircle uses 0–1
        });
        return `path("${d}")`;
    }, [dims, borderRadius, smoothing]);

    return (
        <Tag
            ref={ref}
            onClick={onClick}
            style={{ clipPath, ...style }}
            className={className}
        >
            {children}
        </Tag>
    );
}
