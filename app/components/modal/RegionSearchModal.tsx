"use client";
import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../text/SvgText";
import { SvgInput } from "../text/SvgInput";
import { Squircle } from "../layout/Squircle";
import { SearchIcon } from "../icons/action/SearchIcon";

// Simple Levenshtein distance for fuzzy matching
function getEditDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[a.length][b.length];
}

export function RegionSearchModal({
    isOpen,
    onClose,
    onConfirm,
    type,
    items,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (val: string) => void;
    type: "country" | "state";
    items: string[];
}) {
    const [search, setSearch] = useState("");

    // Reset search when opened
    useEffect(() => {
        if (isOpen) {
            setSearch("");
            // slight delay to allow the modal to mount in DOM before focusing
            setTimeout(() => {
                document.getElementById('region-modal-search-input')?.focus();
            }, 100);
        }
    }, [isOpen]);

    const filteredItems = useMemo(() => {
        if (!search) return items;
        const lower = search.toLowerCase().trim();
        const directMatches = items.filter(item => item.toLowerCase().startsWith(lower) || item.toLowerCase().includes(lower));
        
        // If we found direct matches, return them immediately
        if (directMatches.length > 0) return directMatches;

        // If no direct matches, fallback to fuzzy search to find similar items
        return [...items]
            .map(item => ({
                item,
                distance: getEditDistance(lower, item.toLowerCase())
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 10) // Show top 10 most similar items
            .map(x => x.item);
    }, [search, items]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                >
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={onClose}
                    />
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 300 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 400 }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        className="relative z-10 flex flex-col items-center gap-[10px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Search Pill */}
                        <div
                            className="w-[260px] h-[50px] shrink-0 bg-[#f1f1f1] rounded-full flex items-center px-4 relative overflow-hidden cursor-text"
                            style={{ width: 260, minWidth: 260, maxWidth: 260 }}
                            onClick={() => document.getElementById('region-modal-search-input')?.focus()}
                        >
                            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity ${search ? 'opacity-0' : 'opacity-100'}`}>
                                <SearchIcon className="w-[16px] h-[16px] text-[#aaaaaa]" />
                            </div>
                            <SvgInput
                                id="region-modal-search-input"
                                value={search}
                                onChange={setSearch}
                                placeholder=""
                                height={16}
                                weight="600"
                                align="center"
                                className="w-full text-[#1e1e1e] z-10 bg-transparent"
                            />
                        </div>

                        {/* Result Squircle */}
                        <Squircle
                            borderRadius={20}
                            smoothing={50}
                            className="relative bg-[#f1f1f1] w-[260px] overflow-hidden"
                            // Custom height to fit exactly 3 items with extra spacing + 60px extra
                            // 3 items * 36px = 108px + 2 separators * 20px = 40px + 40px padding = 188px + 60px = 248px
                            style={{ height: 260 }}
                        >
                            <div 
                                className="w-full h-full overflow-y-auto py-5 px-6 flex flex-col items-center custom-scrollbar"
                                style={{
                                    maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
                                    WebkitMaskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)"
                                }}
                            >
                                {filteredItems.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <SvgText text={`No ${type}s found`} weight="600" height={14} className="text-[#aaaaaa]" />
                                    </div>
                                ) : (
                                    filteredItems.map((item, index) => (
                                        <React.Fragment key={item}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onConfirm(item);
                                                    onClose();
                                                }}
                                                className="group w-full shrink-0 flex items-center justify-center cursor-pointer hover:opacity-100 transition-opacity focus:outline-none min-h-[36px]"
                                            >
                                                <SvgText text={item} weight="600" height={16} className="text-[#1e1e1e] group-hover:text-[#0000f4] transition-all duration-200 group-hover:scale-[1.125]" />
                                            </button>

                                            {/* Render 6x6px separator dot between items */}
                                            {index < filteredItems.length - 1 && (
                                                <div className="w-full shrink-0 flex items-center justify-center h-[20px]">
                                                    <div className="w-[6px] h-[6px] rounded-full bg-[#aaaaaa]" />
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </div>
                            <style>{`
                                .custom-scrollbar {
                                    -ms-overflow-style: none;  /* IE and Edge */
                                    scrollbar-width: none;  /* Firefox */
                                }
                                .custom-scrollbar::-webkit-scrollbar {
                                    display: none; /* Chrome, Safari and Opera */
                                }
                            `}</style>
                        </Squircle>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
