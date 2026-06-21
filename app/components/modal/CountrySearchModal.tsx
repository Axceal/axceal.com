"use client";
import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../text/SvgText";
import { SvgInput } from "../text/SvgInput";
import { Squircle } from "../layout/Squircle";
import { SearchIcon } from "../icons/action/SearchIcon";
import countriesData from "../../data/countries.json";

export type CountryInfo = { name: string; code: string; dialCode: string };

const COUNTRIES = countriesData as CountryInfo[];

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

export function CountrySearchModal({
    isOpen,
    onClose,
    onConfirm,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (country: CountryInfo) => void;
}) {
    const [search, setSearch] = useState("");

    // Reset search when opened
    useEffect(() => {
        if (isOpen) {
            setSearch("");
            // slight delay to allow the modal to mount in DOM before focusing
            setTimeout(() => {
                document.getElementById('modal-search-input')?.focus();
            }, 100);
        }
    }, [isOpen]);

    const matchedCountry = useMemo(() => {
        if (!search) return COUNTRIES.find(c => c.name === "India") || COUNTRIES[0];

        const lower = search.toLowerCase().trim();
        const noSpaceLower = lower.replace(/\s+/g, "");

        const matches = COUNTRIES.filter(c => {
            const nameLower = c.name.toLowerCase();
            const initials = c.name.split(' ').map(w => w[0]).join('').toLowerCase();
            const codeLower = c.code.toLowerCase();

            return nameLower.startsWith(lower) ||
                initials === noSpaceLower ||
                initials.startsWith(noSpaceLower) ||
                codeLower === noSpaceLower ||
                codeLower.startsWith(noSpaceLower) ||
                c.dialCode.startsWith(search.replace(/\D/g, ""));
        });

        // Hardcode user preferences for specific initials
        if (noSpaceLower === "us" || noSpaceLower === "usa") return COUNTRIES.find(c => c.code === "US")!;
        if (noSpaceLower === "uk") return COUNTRIES.find(c => c.code === "GB")!;
        if (noSpaceLower === "uae") return COUNTRIES.find(c => c.code === "AE")!;
        if (noSpaceLower === "in" || noSpaceLower === "ind") return COUNTRIES.find(c => c.code === "IN")!;

        const exactMatch = matches.find(c =>
            c.code.toLowerCase() === noSpaceLower ||
            c.name.split(' ').map(w => w[0]).join('').toLowerCase() === noSpaceLower
        );

        if (exactMatch) return exactMatch;
        if (matches.length > 0) return matches[0];

        // If no direct matches, fallback to fuzzy search
        let bestMatch = COUNTRIES[0];
        let minDistance = Infinity;
        for (const c of COUNTRIES) {
            const distance = getEditDistance(lower, c.name.toLowerCase());
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = c;
            }
        }
        return bestMatch || COUNTRIES.find(c => c.name === "India") || COUNTRIES[0];
    }, [search]);

    const dialCodeDigits = matchedCountry.dialCode.split("");

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
                            onClick={() => document.getElementById('modal-search-input')?.focus()}
                        >
                            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity ${search ? 'opacity-0' : 'opacity-100'}`}>
                                <SearchIcon className="w-[16px] h-[16px] text-[#aaaaaa]" />
                            </div>
                            <SvgInput
                                id="modal-search-input"
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
                        <Squircle borderRadius={20} smoothing={50} className="relative bg-[#f1f1f1] w-[260px] h-[170px] flex flex-col items-center justify-between py-5 px-6">

                            {/* Top Row */}
                            <div className="flex items-center justify-between w-full px-2 relative z-10">
                                <SvgText text={matchedCountry.name} weight="600" height={16} className="text-[#aaaaaa]" />
                                <SvgText text={`+${matchedCountry.dialCode}`} weight="600" height={16} className="text-[#1e1e1e]" />
                            </div>

                            {/* Absolutely Centered Circles */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                <div className="flex items-center gap-[5px] pointer-events-auto">
                                    <div className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center shrink-0">
                                        <SvgText text="+" weight="600" height={18} className="text-[#0000f4]" />
                                    </div>
                                    {dialCodeDigits.map((d, i) => (
                                        <div key={i} className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center shrink-0">
                                            <SvgText text={d} weight="600" height={18} className="text-[#0000f4]" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Row */}
                            <button
                                type="button"
                                onClick={() => {
                                    onConfirm(matchedCountry);
                                    onClose();
                                }}
                                className="relative z-10 cursor-pointer focus:outline-none hover:opacity-70 transition-opacity"
                            >
                                <SvgText text="Confirm" weight="600" height={16} className="text-[#0000f4]" />
                            </button>
                        </Squircle>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
