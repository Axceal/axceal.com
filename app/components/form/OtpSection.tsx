"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../text/SvgText";
import { SvgInput } from "../text/SvgInput";
import { Squircle } from "../layout/Squircle";

interface OtpSectionProps {
    otpSent: boolean;
    otp: string[];
    activeField: string;
    focusedOtpIdx: number;
    handleOtpChange: (i: number, val: string) => void;
    handleOtpKeyDown: (i: number, e: React.KeyboardEvent) => void;
    onDigitFocus: (i: number) => void;
    onDigitBlur: () => void;
    sendingOtp: boolean;
    email: string;
    handleSendOtp: () => void;
    message: { kind: "info" | "error"; text: string; field?: string | null } | null;
    layoutId: string;
    otpIdPrefix: string;
    otpKeyPrefix: string;
    gapClass?: string;
    otpWrapRef?: React.RefObject<HTMLDivElement | null>;
    // Transient flag set true for ~2s after a successful send so the Resend
    // button can briefly read "Code sent" instead of an out-of-band toast.
    recentlySent?: boolean;
    // Hide the active-field indicator unless the user has a field focused —
    // prevents the underline from sitting under "otp" on mount or jumping
    // back here after a submit-click blur.
    isFocused?: boolean;
}

export function OtpSection({
    otpSent,
    otp,
    activeField,
    focusedOtpIdx,
    handleOtpChange,
    handleOtpKeyDown,
    onDigitFocus,
    onDigitBlur,
    sendingOtp,
    email,
    handleSendOtp,
    message,
    layoutId,
    otpIdPrefix,
    otpKeyPrefix,
    gapClass = "gap-2",
    otpWrapRef,
    recentlySent = false,
    isFocused = true,
}: OtpSectionProps) {
    return (
        <AnimatePresence>
            {otpSent && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full overflow-hidden flex flex-col gap-5 pt-1"
                >
                    <SvgText text="Check your Email for code" weight="600" height={16} className="text-[#aaaaaa] self-start pl-2" />

                    <div
                        ref={otpWrapRef}
                        className="h-[72px] px-5 py-3 flex items-center justify-between w-full relative"
                    >
                        <Squircle borderRadius={15} smoothing={50} className="absolute inset-0 bg-[#f1f1f1] -z-10" />
                        {activeField === "otp" && isFocused && (
                            <motion.div
                                layoutId={layoutId}
                                className={`absolute -top-[2.5px] left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none z-10 ${message?.kind === "error" ? "bg-[#ff0000]" : "bg-[#0000f4]"}`}
                                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                            />
                        )}
                        <SvgText text="Verify" weight="600" height={14} className="text-[#aaaaaa]" />
                        <div className={`flex ${gapClass}`}>
                            {otp.map((digit, i) => (
                                <div
                                    key={`${otpKeyPrefix}-${i}`}
                                    onClick={() => document.getElementById(`${otpIdPrefix}-${i}`)?.focus()}
                                    className={`w-10 h-10 rounded-full bg-white flex shrink-0 transition-all cursor-text ${focusedOtpIdx === i ? "ring-2 ring-[#0000f4]" : ""}`}
                                >
                                    <SvgInput
                                        id={`${otpIdPrefix}-${i}`}
                                        value={digit}
                                        onChange={(val) => handleOtpChange(i, val)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        onFocus={() => onDigitFocus(i)}
                                        onBlur={onDigitBlur}
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
                        onClick={handleSendOtp}
                        disabled={sendingOtp || !email || recentlySent}
                        className="cursor-pointer disabled:cursor-not-allowed focus:outline-none self-center"
                        aria-label="Resend Code"
                    >
                        <SvgText
                            text={recentlySent ? "Code sent" : sendingOtp ? "Sending..." : "Resend"}
                            weight="600"
                            height={14}
                            maxWidth={Infinity}
                            className={recentlySent ? "text-[#aaaaaa]" : "text-[#0000f4]"}
                        />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
