"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../../../components/SvgText";
import { SvgInput } from "../../../components/SvgInput";
import { SPRING } from "../constants";
import { DisableCircle } from "../../../components/icons/DisableCircle";
import { usePhoneForm } from "./hooks/usePhoneForm";

export default function PhonePage() {
    const {
        firstName,
        country, setCountry,
        countrySearch, setCountrySearch,
        setShowSearch,
        phone,
        sign, setSign,
        phoneOtp,
        phoneOtpSent,
        focusedIdx, setFocusedIdx,
        focusedOtpIdx, setFocusedOtpIdx,
        errorMsg,
        filteredCountries,
        codeNumbers,
        handlePhoneChange,
        handlePhoneKeyDown,
        handleOtpChange,
        handleOtpKeyDown,
        sendPhoneOtp,
    } = usePhoneForm();

    return (
        <div className="flex flex-col gap-[5px] items-center w-full">
            <SvgText
                text={`${firstName}, Add your Phone Number`}
                weight="600" height={16} className="text-[#aaaaaa] mt-[15px] mb-[10px]"
            />

            <div className="flex flex-col gap-3 w-full md:w-fit md:self-center">
                {/* Country Code Block */}
                <div className="bg-[#f1f1f1] rounded-[15px] md:rounded-[20px] px-4 md:px-5 flex justify-between w-full md:w-fit md:self-center gap-2 md:gap-4 items-center h-[60px] md:h-[72px]">
                    <div className="hidden md:block shrink-0">
                        <SvgText text="Country Code" height={14} className="text-[#aaaaaa]" />
                    </div>
                    <div className="block md:hidden shrink-0">
                        <SvgText text="Country Code" height={14} className="text-[#aaaaaa]" />
                    </div>
                    <div className="flex items-center gap-2 md:gap-2">
                        <button
                            onClick={() => setSign(sign === "+" ? "-" : "+")}
                            className="w-[36px] h-[36px] md:w-10 md:h-10 rounded-full bg-white flex items-center justify-center cursor-pointer transition-colors shrink-0 hover:bg-[#e0e0e0]"
                        >
                            <SvgText text={sign} weight="600" height={18} className="text-[#0000f4]" />
                        </button>
                        {[0, 1, 2].map(i => {
                            const digit = codeNumbers[i];
                            return (
                                <div key={`cc-${i}`} className="w-[36px] h-[36px] md:w-10 md:h-10 rounded-full bg-white flex items-center justify-center shrink-0">
                                    {digit ? (
                                        <SvgText text={digit} weight="600" height={16} className="text-[#1e1e1e]" />
                                    ) : (
                                        <DisableCircle />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Phone Number Block — full-width on mobile, compact on desktop */}
                <div className="bg-[#f1f1f1] rounded-[20px] md:rounded-[20px] px-4 py-4 md:px-5 md:py-0 w-full md:w-fit md:h-[72px] flex items-center">
                    {/* Mobile: two rows — flex-1 on each cell keeps spacing identical across rows */}
                    <div className="flex flex-col gap-3 w-full md:hidden">
                        <div className="flex w-full items-center">
                            {phone.slice(0, Math.ceil(phone.length / 2)).map((digit, i) => (
                                <div key={`phone-${i}`} className="flex-1 flex items-center justify-center">
                                    <div
                                        onClick={() => document.getElementById(`phone-digit-${i}`)?.focus()}
                                        className={`w-[40px] h-[40px] rounded-full bg-white flex shrink-0 transition-all cursor-text items-center justify-center ${focusedIdx === i ? "ring-2 ring-[#0000f4]" : ""}`}
                                    >
                                        <SvgInput
                                            id={`phone-digit-${i}`}
                                            value={digit}
                                            onChange={val => handlePhoneChange(i, val)}
                                            onKeyDown={e => handlePhoneKeyDown(i, e)}
                                            onFocus={() => setFocusedIdx(i)}
                                            onBlur={() => setFocusedIdx(current => current === i ? null : current)}
                                            height={16}
                                            weight="600"
                                            align="center"
                                            className="text-[#1e1e1e] w-full"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <span
                            className="block w-[10px] self-center aspect-square rounded-full bg-[#aaaaaa] "
                            aria-hidden
                        />
                        <div className="flex w-full items-center">
                            {phone.length % 2 === 1 && <div className="flex-[0.5]" />}
                            {phone.slice(Math.ceil(phone.length / 2)).map((digit, i) => {
                                const idx = Math.ceil(phone.length / 2) + i;
                                return (
                                    <div key={`phone-${idx}`} className="flex-1 flex items-center justify-center">
                                        <div
                                            onClick={() => document.getElementById(`phone-digit-${idx}`)?.focus()}
                                            className={`w-[40px] h-[40px] rounded-full bg-white flex shrink-0 transition-all cursor-text items-center justify-center ${focusedIdx === idx ? "ring-2 ring-[#0000f4]" : ""}`}
                                        >
                                            <SvgInput
                                                id={`phone-digit-${idx}`}
                                                value={digit}
                                                onChange={val => handlePhoneChange(idx, val)}
                                                onKeyDown={e => handlePhoneKeyDown(idx, e)}
                                                onFocus={() => setFocusedIdx(idx)}
                                                onBlur={() => setFocusedIdx(current => current === idx ? null : current)}
                                                height={16}
                                                weight="600"
                                                align="center"
                                                className="text-[#1e1e1e] w-full"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {phone.length % 2 === 1 && <div className="flex-[0.5]" />}
                        </div>
                    </div>

                    {/* Desktop: single row */}
                    <div className="hidden md:flex justify-start gap-2 w-fit items-center">
                        {phone.map((digit, i) => (
                            <div
                                key={`phone-${i}`}
                                onClick={() => document.getElementById(`phone-digit-${i}`)?.focus()}
                                className={`w-10 h-10 rounded-full bg-white flex shrink-0 transition-all cursor-text items-center justify-center ${focusedIdx === i ? "ring-2 ring-[#0000f4]" : ""}`}
                            >
                                <SvgInput
                                    id={`phone-digit-${i}`}
                                    value={digit}
                                    onChange={val => handlePhoneChange(i, val)}
                                    onKeyDown={e => handlePhoneKeyDown(i, e)}
                                    onFocus={() => setFocusedIdx(i)}
                                    onBlur={() => setFocusedIdx(current => current === i ? null : current)}
                                    height={16}
                                    weight="600"
                                    align="center"
                                    className="text-[#1e1e1e] w-full"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* OTP section — shown after Twilio sends SMS */}
            <AnimatePresence>
                {phoneOtpSent && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 10 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="flex flex-col gap-3 overflow-hidden mt-1"
                    >
                        <SvgText text="Check your Phone for OTP" weight="600" height={16} className="text-[#aaaaaa] self-start pl-3 mt-2" />

                        <div className="bg-[#f1f1f1] rounded-[20px] h-[72px] px-1 md:px-5 flex items-center justify-between w-[calc(100%+32px)] -mx-4 md:mx-0 md:w-[360px] gap-2 md:gap-4">
                            <div className="pl-2 shrink-0">
                                <SvgText text="OTP" weight="500" height={14} className="text-[#aaaaaa]" />
                            </div>
                            <div className="flex w-full justify-between md:justify-start md:gap-2">
                                {phoneOtp.map((digit, i) => (
                                    <div
                                        key={`phone-otp-${i}`}
                                        onClick={() => document.getElementById(`phone-otp-digit-${i}`)?.focus()}
                                        className={`w-[36px] h-[36px] md:w-10 md:h-10 rounded-full bg-white flex shrink-0 items-center justify-center transition-all cursor-text ${focusedOtpIdx === i ? "ring-2 ring-[#0000f4]" : ""}`}
                                    >
                                        <SvgInput
                                            id={`phone-otp-digit-${i}`}
                                            value={digit}
                                            onChange={val => handleOtpChange(i, val)}
                                            onKeyDown={e => handleOtpKeyDown(i, e)}
                                            onFocus={() => setFocusedOtpIdx(i)}
                                            onBlur={() => setFocusedOtpIdx(current => current === i ? null : current)}
                                            height={18}
                                            weight="600"
                                            align="center"
                                            className="text-[#1e1e1e] w-full"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => void sendPhoneOtp()}
                            className="cursor-pointer focus:outline-none shrink-0 self-center"
                        >
                            <SvgText text="Resend" weight="600" height={14} className="text-[#0000f4]" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Always-visible error */}
            {errorMsg && (
                <SvgText text={errorMsg} weight="500" height={12} className="text-[#e11d48] pl-3 mt-1" />
            )}

            {/* Country search — hidden while OTP is in progress */}
            <AnimatePresence>
                {!phoneOtpSent && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 10 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="flex flex-col gap-4 self-center items-center overflow-hidden"
                    >
                        <div className="bg-[#f1f1f1] rounded-full py-3 flex items-center justify-center w-[150px]">
                            <SvgInput
                                id="country-search-input"
                                value={countrySearch}
                                onChange={v => { setCountrySearch(v); setShowSearch(v.length > 0); }}
                                placeholder="Search Country"
                                align="center"
                                weight="600"
                                height={14}
                                className="text-[#0000f4] w-full outline-none focus:outline-none self-center"
                            />
                        </div>

                        <AnimatePresence>
                            {countrySearch.length > 0 && filteredCountries.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={SPRING}
                                    className="flex flex-wrap items-center"
                                >
                                    {filteredCountries.slice(0, 5).map(c => (
                                        <button
                                            key={c.code}
                                            onClick={() => { setCountry(c); setCountrySearch(""); setShowSearch(false); }}
                                            className="cursor-pointer hover:bg-[#0000f4] transition-colors px-3 py-[10px] rounded-full group flex items-center justify-center outline-none focus:outline-none focus:ring-0"
                                        >
                                            <SvgText
                                                text={`${c.code} ${c.name}`}
                                                weight="600" height={14}
                                                className="text-[#0000f4] group-hover:text-white transition-colors"
                                            />
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
