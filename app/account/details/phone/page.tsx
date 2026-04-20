"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../../../components/SvgText";
import { SvgInput } from "../../../components/SvgInput";
import { useAccountDetails } from "../_context";
import { COUNTRIES, SPRING } from "../_constants";

export default function PhonePage() {
    const {
        firstName,
        country, setCountry,
        countrySearch, setCountrySearch,
        showSearch, setShowSearch,
        phone, setPhone,
        phoneRefs,
    } = useAccountDetails();

    const [sign, setSign] = useState<"+" | "-">("+");
    const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

    const handlePhoneChange = (i: number, val: string) => {
        const v = val.replace(/\D/g, "").slice(-1);
        const updated = [...phone];
        updated[i] = v;
        setPhone(updated);
        if (v && i < phone.length - 1) setTimeout(() => document.getElementById(`phone-digit-${i + 1}`)?.focus(), 10);
    };

    const handlePhoneKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !phone[i] && i > 0) {
            setTimeout(() => document.getElementById(`phone-digit-${i - 1}`)?.focus(), 10);
        }
    };

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().startsWith(countrySearch.toLowerCase()) ||
        c.code.includes(countrySearch)
    );

    const codeNumbers = country.code.replace(/\D/g, "").split("");

    return (
        <div className="flex flex-col gap-[5px] h-[360px]">
            <SvgText
                text={`${firstName}, Add your Phone Number`}
                weight="600" height={16} className="text-[#aaaaaa] mt-[15px] mb-[10px]"
            />

            <div className="flex flex-col gap-3">
                {/* Country Code Block */}
                <div className="bg-[#f1f1f1] rounded-[20px] px-5 flex self-start justify-between w-fit gap-4 items-center h-[72px]">
                    <SvgText text="Country Code" height={14} className="text-[#aaaaaa] shrink-0" />
                    <div className="flex items-center gap-2">
                        {/* +/- toggle */}
                        <button
                            onClick={() => setSign(sign === "+" ? "-" : "+")}
                            className="w-10 h-10 rounded-full bg-white flex items-center justify-center cursor-pointer transition-colors shrink-0 hover:bg-[#e0e0e0]"
                        >
                            <SvgText text={sign} weight="600" height={20} className="text-[#0000f4]" />
                        </button>

                        {/* Rest of the country code digits */}
                        {[0, 1, 2].map(i => {
                            const digit = codeNumbers[i];
                            return (
                                <div
                                    key={`cc-${i}`}
                                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0"
                                >
                                    {digit ? <SvgText text={digit} weight="600" height={18} className="text-[#1e1e1e]" /> : null}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Phone Number Block */}
                <div className="bg-[#f1f1f1] rounded-[20px] px-5 flex justify-between w-fit items-center h-[72px]">
                    {/* <SvgText text="Phone Number" height={16} className="text-[#aaaaaa] shrink-0" /> */}
                    <div className="flex items-center gap-2">
                        {phone.map((digit, i) => (
                            <div
                                key={`phone-${i}`}
                                onClick={() => document.getElementById(`phone-digit-${i}`)?.focus()}
                                className={`w-10 h-10 rounded-full bg-white flex shrink-0 transition-all cursor-text ${focusedIdx === i ? "ring-2 ring-[#0000f4]" : ""}`}
                            >
                                <SvgInput
                                    id={`phone-digit-${i}`}
                                    value={digit}
                                    onChange={val => handlePhoneChange(i, val)}
                                    onKeyDown={e => handlePhoneKeyDown(i, e)}
                                    onFocus={() => setFocusedIdx(i)}
                                    onBlur={() => setFocusedIdx(current => current === i ? null : current)}
                                    height={18}
                                    weight="600"
                                    align="center"
                                    className="text-[#1e1e1e] w-full"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search Country toggle and Name */}
            <div className="flex items-center  gap-2 self-start ">
                <button onClick={() => setShowSearch(s => !s)} className="cursor-pointer outline-none mt-[10px] focus:outline-none focus:ring-0">
                    <SvgText text="Search Country" weight="600" height={14} className="text-[#0000f4]" />
                </button>
                {!showSearch && (
                    <SvgText text={` - ${country.name}`} weight="600" height={14} className="text-[#aaaaaa] mt-[5px] " />
                )}
            </div>

            {/* Country search panel (organic flex anchoring) */}
            <div className="w-full">
                <AnimatePresence>
                    {showSearch && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={SPRING}
                            className="flex flex-col gap-3 pr-4"
                        >
                            <div className="bg-[#f1f1f1] flex flex-row rounded-full px-6 py-4 items-center gap-2 w-[200px]">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                                    <circle cx="6" cy="6" r="5" stroke="#aaaaaa" strokeWidth="1.3" />
                                    <path d="M10 10l2.5 2.5" stroke="#aaaaaa" strokeWidth="1.3" strokeLinecap="round" />
                                </svg>
                                <div className="flex-1 w-full flex">
                                    <SvgInput
                                        id="country-search-input"
                                        value={countrySearch}
                                        onChange={setCountrySearch}
                                        placeholder="Search country..."
                                        weight="600"
                                        height={14}
                                        className="text-[#1e1e1e] w-full outline-none focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 flex-wrap items-center">
                                {countrySearch.length > 0 && filteredCountries.slice(0, 5).map(c => (
                                    <button
                                        key={c.code}
                                        onClick={() => {
                                            setCountry(c);
                                            setShowSearch(false);
                                            setCountrySearch("");
                                        }}
                                        className="cursor-pointer hover:bg-[#0000f4] hover:text-white transition-colors bg-[#f1f1f1] px-4 py-[10px] rounded-full group flex items-center justify-center outline-none focus:outline-none focus:ring-0"
                                    >
                                        <SvgText
                                            text={`${c.code} ${c.name}`}
                                            weight="600" height={14}
                                            className="text-[#0000f4] group-hover:text-white transition-colors"
                                        />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
