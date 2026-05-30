"use client";
import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../text/SvgText";

interface SuggestionPillsProps {
    suggestions: string[];
    onSelect: (val: string) => void;
    visible: boolean;
    height?: number;
}

export function SuggestionPills({ suggestions, onSelect, visible, height = 14 }: SuggestionPillsProps) {
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (listRef.current) listRef.current.scrollLeft = 0;
    }, [suggestions]);

    const show = visible && suggestions.length > 0;

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                >
                    <div
                        ref={listRef}
                        className="flex flex-row gap-x-2 overflow-x-auto scrollbar-hide pt-2 pb-1"
                        style={{ scrollbarWidth: "none" }}
                    >
                        {suggestions.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    onSelect(s);
                                }}
                                className="shrink-0 text-[#0000f4] cursor-pointer bg-transparent border-none outline-none pr-[10px] pl-[20px]"
                            >
                                <SvgText text={s} weight="600" height={height} className="text-[#0000f4]" />
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
