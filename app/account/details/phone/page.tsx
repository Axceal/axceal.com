"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../../../components/text/SvgText";
import { SvgInput } from "../../../components/text/SvgInput";
import { SPRING } from "../constants";
import { DisableCircle } from "../../../components/icons/state/DisableCircle";
import { SearchIcon } from "../../../components/icons/action/SearchIcon";
import { usePhoneForm } from "./hooks/usePhoneForm";
import { Squircle } from "../../../components/layout/Squircle";
import { CountrySearchModal } from "../../../components/modal/CountrySearchModal";

export default function PhonePage() {
    const {
        firstName,
        country, setCountry,
        countrySearch, setCountrySearch,
        showSearch, setShowSearch,
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
            <div className="mt-[30px] mb-[20px]">
                <SvgText
                    text={`${firstName}, Add your Phone Number`}
                    weight="600" height={16} className="text-[#aaaaaa]" maxWidth={Infinity}
                />
            </div>

            <div className="flex flex-col gap-3 w-full md:w-fit md:self-center items-center">
                {/* Country Code Block */}
                <div className="flex items-center self-center">
                    <div 
                        className="h-[50px] bg-[#f1f1f1] rounded-full p-[5px] flex items-center gap-[5px] w-fit cursor-pointer hover:bg-[#e0e0e0] transition-colors"
                        onClick={() => setShowSearch(true)}
                    >
                        <div className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center shrink-0">
                            <SvgText text={sign} weight="600" height={18} className="text-[#0000f4]" />
                        </div>
                        {Array.from(codeNumbers).map((digit, i) => (
                            <div key={`cc-${i}`} className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center shrink-0">
                                <SvgText text={digit as string} weight="600" height={18} className="text-[#0000f4]" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Phone Number Block */}
                <div className="flex items-center gap-[5px] w-fit h-[50px] bg-[#f1f1f1] rounded-full p-[5px]">
                    <div
                        className="bg-white h-[40px] rounded-full flex items-center justify-around px-2 md:px-4 w-[175px] md:w-[200px] cursor-text"
                        onClick={() => {
                            const firstEmptyIdx = phone.findIndex(d => !d);
                            const targetIdx = firstEmptyIdx === -1 ? 9 : firstEmptyIdx;
                            document.getElementById(`phone-digit-${targetIdx}`)?.focus();
                        }}
                    >
                        {phone.slice(0, 5).map((digit, i) => (
                            <div
                                key={`phone-${i}`}
                                className="flex items-center justify-center w-[26px] md:w-[30px] h-full transition-all"
                            >
                                <SvgInput
                                    id={`phone-digit-${i}`}
                                    value={digit}
                                    placeholder={focusedIdx === i ? "" : "X"}
                                    onChange={val => handlePhoneChange(i, val)}
                                    onKeyDown={e => handlePhoneKeyDown(i, e)}
                                    onFocus={() => setFocusedIdx(i)}
                                    onBlur={() => setFocusedIdx(current => current === i ? null : current)}
                                    height={18}
                                    weight="600"
                                    align="center"
                                    className={`w-full ${digit || focusedIdx === i ? "text-[#0000f4]" : "text-[#aaaaaa]"}`}
                                />
                            </div>
                        ))}
                    </div>
                    <div
                        className="bg-white h-[40px] rounded-full flex items-center justify-around px-2 md:px-4 w-[175px] md:w-[200px] cursor-text"
                        onClick={() => {
                            const firstEmptyIdx = phone.findIndex(d => !d);
                            const targetIdx = firstEmptyIdx === -1 ? 9 : firstEmptyIdx;
                            document.getElementById(`phone-digit-${targetIdx}`)?.focus();
                        }}
                    >
                        {phone.slice(5).map((digit, i) => {
                            const idx = 5 + i;
                            return (
                                <div
                                    key={`phone-${idx}`}
                                    className="flex items-center justify-center w-[26px] md:w-[30px] h-full transition-all"
                                >
                                    <SvgInput
                                        id={`phone-digit-${idx}`}
                                        value={digit}
                                        placeholder={focusedIdx === idx ? "" : "X"}
                                        onChange={val => handlePhoneChange(idx, val)}
                                        onKeyDown={e => handlePhoneKeyDown(idx, e)}
                                        onFocus={() => setFocusedIdx(idx)}
                                        onBlur={() => setFocusedIdx(current => current === idx ? null : current)}
                                        height={18}
                                        weight="600"
                                        align="center"
                                        className={`w-full ${digit || focusedIdx === idx ? "text-[#0000f4]" : "text-[#aaaaaa]"}`}
                                    />
                                </div>
                            );
                        })}
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
                        <SvgText text="Check your Phone for Code" weight="600" height={16} className="text-[#aaaaaa] self-start pl-3 mt-2" />

                        <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] h-[72px] px-1 md:px-5 flex items-center justify-between w-[calc(100%+32px)] -mx-4 md:mx-0 md:w-[360px] gap-2 md:gap-4">
                            <div className="pl-2 shrink-0">
                                <SvgText text="Code" weight="500" height={14} className="text-[#aaaaaa]" />
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
                        </Squircle>

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
                <SvgText text={errorMsg} weight="500" height={12} className="text-[#ff0000] pl-3 mt-1" />
            )}

            <CountrySearchModal
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
                onConfirm={(c) => {
                    setCountry({
                        name: c.name,
                        code: `+${c.dialCode}`,
                        digits: 10,
                    });
                }}
            />
        </div>
    );
}
