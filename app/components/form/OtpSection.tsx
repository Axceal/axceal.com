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
    resendCountdown?: number;
    // Hide the active-field indicator unless the user has a field focused —
    // prevents the underline from sitting under "otp" on mount or jumping
    // back here after a submit-click blur.
    isFocused?: boolean;
    disabled?: boolean;
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
    otpWrapRef,
    resendCountdown = 0,
    isFocused = true,
    disabled = false,
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

                    <div ref={otpWrapRef} className="relative w-full pt-6 pb-6 px-6 flex flex-col gap-4">
                        <Squircle borderRadius={20} smoothing={60} className="absolute inset-0 bg-[#f1f1f1] -z-10" />
                        {activeField === "otp" && isFocused && (
                            <motion.div
                                layoutId={layoutId}
                                className={`absolute -top-[2.5px] left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none z-10 ${message?.kind === "error" ? "bg-[#ff0000]" : "bg-[#0000f4]"}`}
                                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                            />
                        )}

                        <div className="flex justify-between items-center w-full px-1">
                            <SvgText text="Verify Code" weight="600" height={16} className="text-[#aaaaaa]" />
                            <div className="flex items-center gap-1">
                                {resendCountdown > 0 ? (
                                    <>
                                        <SvgText text="Wait," weight="600" height={16} className="text-[#1e1e1e]" />
                                        <SvgText text={`${resendCountdown}s`} weight="600" height={16} className="text-[#0000f4]" />
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        disabled={sendingOtp || !email || disabled}
                                        className="cursor-pointer disabled:cursor-not-allowed focus:outline-none"
                                    >
                                        <SvgText
                                            text={sendingOtp ? "Sending..." : "Resend"}
                                            weight="600"
                                            height={16}
                                            className="text-[#0000f4]"
                                        />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between w-full gap-1">
                            {otp.map((digit, i) => {
                                const isActive = focusedOtpIdx === i || digit;
                                return (
                                    <div
                                        key={`${otpKeyPrefix}-${i}`}
                                        onClick={() => !disabled && document.getElementById(`${otpIdPrefix}-${i}`)?.focus()}
                                        className={`w-[56px] h-[56px] rounded-full bg-white flex items-center justify-center shrink-0 transition-all overflow-hidden ${disabled ? "cursor-not-allowed opacity-60" : "cursor-text"} ${isActive && !disabled ? "border-[2px] border-[#0000f4]" : ""}`}
                                    >
                                        <SvgInput
                                            id={`${otpIdPrefix}-${i}`}
                                            value={digit}
                                            onChange={(val) => handleOtpChange(i, val)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            onFocus={() => onDigitFocus(i)}
                                            onBlur={onDigitBlur}
                                            readOnly={disabled}
                                            height={18}
                                            weight="600"
                                            align="center"
                                            cursorHeightScale={1.5}
                                            cursorColor="#0000f4"
                                            className={`text-[#1e1e1e] w-full text-center bg-transparent ${disabled ? "cursor-not-allowed" : ""}`}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
