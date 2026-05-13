"use client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../../components/SvgText";
import { SvgInput } from "../../components/SvgInput";
import { PasswordToggle } from "../../components/PasswordToggle";
import { Squircle } from "@/app/components/Squircle";
import { useChangePasswordForm } from "./hooks/useChangePasswordForm";
import { useAuthGate } from "@/app/hooks/useAuthGate";

export default function ChangePasswordPage() {
    const gating = useAuthGate();
    const {
        otp,
        focusedOtpIdx, setFocusedOtpIdx,
        password, setPassword,
        rePassword, setRePassword,
        showPassword, setShowPassword,
        showRePassword, setShowRePassword,
        setActiveField,
        sendingOtp,
        submitting,
        message,
        otpWrapRef,
        passwordWrapRef,
        repasswordWrapRef,
        otpVerified,
        passwordValid,
        sendOtp,
        handleOtpChange,
        handleOtpKeyDown,
        handleSave,
        indicatorTop,
    } = useChangePasswordForm();

    if (gating) return null;

    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="relative flex flex-col items-center gap-4 w-full px-6 lg:px-0 lg:w-[300px] max-w-[400px]">
                {/* Header row wrapper for mobile */}
                <div className="relative flex items-center justify-center w-full mb-2 lg:mb-0">
                    <Link href="/account" className="absolute left-0 lg:right-full lg:left-auto lg:mr-6 lg:top-[18px] whitespace-nowrap">
                        <SvgText text="Back" weight="600" height={16} className="text-[#1e1e1e]" />
                    </Link>
                    <Squircle smoothing={60} borderRadius={15} className="bg-[#0000f4] w-[240px] lg:w-full py-5 flex items-center justify-center">
                        <SvgText text="Change Password" weight="600" height={14} className="text-white" />
                    </Squircle>
                </div>

                {/* Active indicator */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none transition-all duration-200 ease-in-out bg-[#0000f4] z-10"
                    style={{
                        top: indicatorTop !== null ? `${indicatorTop}px` : undefined,
                        opacity: indicatorTop !== null ? 1 : 0,
                    }}
                />

                <SvgText text="Check your Email for code" weight="600" height={16} className="text-[#aaaaaa] self-start pl-2 mt-[10px]" />

                {/* OTP box */}
                <div className="w-full flex flex-col gap-2">
                    <div
                        ref={otpWrapRef}
                        className="bg-[#f1f1f1] rounded-[15px] h-[72px] px-5 py-3 flex items-center justify-between w-full"
                    >
                        <SvgText text="Verify" weight="600" height={14} className="text-[#aaaaaa]" />
                        <div className="flex gap-2">
                            {otp.map((digit, i) => (
                                <div
                                    key={`change-pw-otp-${i}`}
                                    onClick={() => document.getElementById(`change-pw-otp-digit-${i}`)?.focus()}
                                    className={`w-10 h-10 rounded-full bg-white flex shrink-0 transition-all cursor-text ${focusedOtpIdx === i ? "ring-2 ring-[#0000f4]" : ""}`}
                                >
                                    <SvgInput
                                        id={`change-pw-otp-digit-${i}`}
                                        value={digit}
                                        onChange={(val) => handleOtpChange(i, val)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        onFocus={() => { setActiveField("otp"); setFocusedOtpIdx(i); }}
                                        onBlur={() => setFocusedOtpIdx(-1)}
                                        height={18}
                                        weight="600"
                                        align="center"
                                        className="text-[#1e1e1e] w-full"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    {message?.field === "otp" && (
                        <SvgText text={message.text} weight="500" height={14} className="text-[#ff0000] self-center" />
                    )}
                </div>

                {/* Resend */}
                <button
                    type="button"
                    onClick={sendOtp}
                    disabled={sendingOtp}
                    className="cursor-pointer disabled:opacity-60 focus:outline-none self-center"
                >
                    <SvgText
                        text={sendingOtp ? "Sending..." : "Resend"}
                        weight="600"
                        height={14}
                        className="text-[#0000f4]"
                    />
                </button>

                {/* New Password — hidden until OTP is verified */}
                <AnimatePresence>
                    {otpVerified && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="w-full overflow-hidden pt-1"
                        >
                            <div className="w-full flex flex-col gap-2">
                                <div ref={passwordWrapRef} className="w-full">
                                    <SvgInput
                                        id="change-pw-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="New Password"
                                        value={password}
                                        onChange={setPassword}
                                        weight="500"
                                        height={14}
                                        className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full pl-8 pr-1 py-1"
                                        onFocus={() => setActiveField("password")}
                                        rightSlot={
                                            <PasswordToggle shown={showPassword} onToggle={() => setShowPassword(s => !s)} />
                                        }
                                    />
                                </div>
                                {message?.field === "password" && (
                                    <SvgText text={message.text} weight="500" height={14} className="text-[#ff0000] self-center" />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Re-Enter Password — hidden until password is valid */}
                <AnimatePresence>
                    {passwordValid && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="w-full overflow-hidden pt-1"
                        >
                            <div className="w-full flex flex-col gap-2">
                                <div ref={repasswordWrapRef} className="w-full">
                                    <SvgInput
                                        id="change-pw-repassword"
                                        type={showRePassword ? "text" : "password"}
                                        placeholder="Re-Enter new Password"
                                        value={rePassword}
                                        onChange={setRePassword}
                                        weight="500"
                                        height={14}
                                        className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full pl-8 pr-1 py-1"
                                        onFocus={() => setActiveField("repassword")}
                                        rightSlot={
                                            <PasswordToggle shown={showRePassword} onToggle={() => setShowRePassword(s => !s)} />
                                        }
                                    />
                                </div>
                                {message?.field === "repassword" && (
                                    <SvgText text={message.text} weight="500" height={14} className="text-[#ff0000] self-center" />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* General (network/server) errors only */}
                <div className="h-[20px] flex items-center justify-center">
                    {message && !message.field && (
                        <SvgText
                            text={message.text}
                            weight="500"
                            height={14}
                            className={message.kind === "error" ? "text-[#ff0000]" : "text-[#0000f4]"}
                        />
                    )}
                </div>

                {/* Save */}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={submitting}
                    className="bg-[#0000f4] rounded-full px-12 py-4 focus:outline-none cursor-pointer hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    <SvgText text={submitting ? "Saving..." : "Save"} weight="600" height={16} className="text-white" />
                </button>
            </div>
        </main>
    );
}
