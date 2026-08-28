"use client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../../components/text/SvgText";
import { SvgInput } from "../../components/text/SvgInput";
import { PasswordToggle } from "../../components/form/PasswordToggle";
import { PasswordConstraints } from "../../components/form/PasswordConstraints";
import { Squircle } from "@/app/components/layout/Squircle";
import { useChangePasswordForm } from "./hooks/useChangePasswordForm";
import { useAuthGate } from "@/app/hooks/useAuthGate";

export default function ChangePasswordPage() {
    const gating = useAuthGate();
    const {
        currentPassword, setCurrentPassword,
        showCurrentPassword, setShowCurrentPassword,
        currentPasswordVerified,
        verifyingCurrentPassword,
        verifyCurrentPassword,
        otp,
        focusedOtpIdx, setFocusedOtpIdx,
        password, setPassword,
        rePassword, setRePassword,
        showPassword, setShowPassword,
        showRePassword, setShowRePassword,
        setActiveField,
        sendingOtp,
        verifyingOtp,
        submitting,
        message,
        currentPasswordWrapRef,
        otpWrapRef,
        passwordWrapRef,
        repasswordWrapRef,
        otpVerified,
        passwordValid,
        isLengthValid,
        hasSpecialChar,
        hasUpper,
        hasDigit,
        hasAnyConstraint,
        sendOtp,
        handleOtpChange,
        handleOtpKeyDown,
        handleSave,
        indicatorTop,
        resendCountdown,
        isFocused,
        focusField,
        blurField,
        activeField,
    } = useChangePasswordForm();

    if (gating) return null;

    return (
        <main className="flex-1 flex items-center justify-center">
            <div className="relative flex flex-col items-center gap-4 w-[min(100vw-2rem,320px)]">
                <div className="flex w-full items-center justify-start gap-[15px] mb-2 lg:mb-0">
                    <Link href="/account" className="flex items-center w-fit shrink-0 whitespace-nowrap hover:opacity-80 transition-opacity">
                        <SvgText text="Back" weight="600" height={16} className="text-[#0000f4]" />
                    </Link>
                    <div className="w-[8px] h-[8px] rounded-full bg-[#0000f4] shrink-0" aria-hidden />
                    <SvgText text="Change Password" weight="600" height={20} className="text-[#1e1e1e]" />
                </div>

                {/* Active indicator */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none transition-all duration-200 ease-in-out bg-[#0000f4] z-10"
                    style={{
                        top: indicatorTop !== null ? `${indicatorTop}px` : undefined,
                        opacity: isFocused && indicatorTop !== null ? 1 : 0,
                    }}
                />

                {/* Current Password */}
                <div className="w-full flex flex-col gap-2 mt-[10px]">
                    <div ref={currentPasswordWrapRef} className="w-full">
                        <SvgInput
                            id="change-pw-current"
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Current Password"
                            value={currentPassword}
                            onChange={setCurrentPassword}
                            weight="500"
                            height={18}
                            align="center"
                            readOnly={otpVerified}
                            className={`w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full pl-8 pr-1 py-1 ${otpVerified ? "opacity-60 cursor-not-allowed" : ""}`}
                            onFocus={() => focusField("current")}
                            onBlur={blurField}
                            rightSlot={
                                <PasswordToggle shown={showCurrentPassword} onToggle={() => setShowCurrentPassword(s => !s)} />
                            }
                        />
                    </div>
                    {message?.field === "current" && (
                        <SvgText text={message.text} weight="500" height={14} className="text-[#ff0000] self-center" />
                    )}
                </div>

                {/* Forgot Password (hidden after verification) */}
                <div className="w-full flex flex-col items-center mt-2">
                    <AnimatePresence>
                        {!currentPasswordVerified && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex flex-col items-center w-full overflow-hidden"
                            >
                                <Link
                                    href="/forgot-password"
                                    className="hover:opacity-90 transition-opacity py-1"
                                >
                                    <SvgText
                                        text="Forgot Password"
                                        weight="600"
                                        height={14}
                                        className="text-[#0000f4]"
                                    />
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* OTP section — shown only after current password verified */}
                <AnimatePresence>
                    {currentPasswordVerified && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="w-full overflow-hidden flex flex-col gap-4"
                        >
                            <SvgText text="Check your Email for code" weight="600" height={16} className="text-[#aaaaaa] self-start pl-2" />

                            {/* OTP box */}
                            <div className="w-full flex flex-col gap-2">
                                <div ref={otpWrapRef} className="relative w-full pt-6 pb-6 px-6 flex flex-col gap-4">
                                    <Squircle
                                        borderRadius={20}
                                        smoothing={60}
                                        className="absolute inset-0 bg-[#f1f1f1] -z-10"
                                    />
                                    <div className="flex justify-between items-center w-full px-1 h-[16px]">
                                        <SvgText text="Verify Code" weight="600" height={16} className="text-[#aaaaaa]" />
                                        <div className="flex items-center gap-1">
                                            {otpVerified ? (
                                                <button
                                                    type="button"
                                                    disabled
                                                    className="cursor-not-allowed focus:outline-none"
                                                >
                                                    <SvgText
                                                        text="Done"
                                                        weight="600"
                                                        height={16}
                                                        maxWidth={200}
                                                        className="text-[#aaaaaa]"
                                                    />
                                                </button>
                                            ) : resendCountdown > 0 ? (
                                                <>
                                                    <SvgText text="Wait," weight="600" height={16} className="text-[#1e1e1e]" />
                                                    <SvgText text={`${resendCountdown}s`} weight="600" height={16} className="text-[#0000f4]" />
                                                </>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={sendOtp}
                                                    disabled={sendingOtp || submitting}
                                                    className="cursor-pointer disabled:cursor-not-allowed focus:outline-none"
                                                >
                                                    <SvgText
                                                        text={sendingOtp ? "Sending..." : "Resend"}
                                                        weight="600"
                                                        height={16}
                                                        maxWidth={200}
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
                                                    key={`change-pw-otp-${i}`}
                                                    onClick={() => !otpVerified && document.getElementById(`change-pw-otp-digit-${i}`)?.focus()}
                                                    className={`w-[56px] h-[56px] rounded-full bg-white flex items-center justify-center shrink-0 transition-all overflow-hidden ${otpVerified ? "cursor-not-allowed opacity-60" : "cursor-text"} ${isActive && !otpVerified ? "border-[2px] border-[#0000f4]" : ""}`}
                                                >
                                                    <SvgInput
                                                        id={`change-pw-otp-digit-${i}`}
                                                        value={digit}
                                                        onChange={(val) => handleOtpChange(i, val)}
                                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                                        onFocus={() => { focusField("otp"); setFocusedOtpIdx(i); }}
                                                        onBlur={blurField}
                                                        readOnly={otpVerified}
                                                        height={18}
                                                        weight="600"
                                                        align="center"
                                                        cursorHeightScale={1.5}
                                                        cursorColor="#0000f4"
                                                        className={`text-[#1e1e1e] w-full text-center bg-transparent ${otpVerified ? "cursor-not-allowed" : ""}`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {message?.field === "otp" && (
                                    <SvgText text={message.text} weight="500" height={14} className="text-[#ff0000] self-center" />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                                        height={18}
                                        align="center"
                                        className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full pl-8 pr-1 py-1"
                                        onFocus={() => focusField("password")}
                                        onBlur={blurField}
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

                {/* Password constraints */}
                <AnimatePresence initial={false}>
                    {otpVerified && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex flex-col items-center w-full mt-[-10px] overflow-hidden"
                        >
                            <PasswordConstraints
                                passwordLength={password.length}
                                isLengthValid={isLengthValid}
                                hasSpecialChar={hasSpecialChar}
                                hasUpper={hasUpper}
                                hasDigit={hasDigit}
                            />
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
                                        height={18}
                                        align="center"
                                        className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full pl-8 pr-1 py-1"
                                        onFocus={() => focusField("repassword")}
                                        onBlur={blurField}
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
                <div className="flex items-center justify-center text-center empty:hidden min-h-[16px]">
                    {message && !message.field && (
                        <SvgText
                            text={message.text}
                            weight="500"
                            height={14}
                            className={message.kind === "error" ? "text-[#ff0000]" : "text-[#0000f4]"}
                        />
                    )}
                </div>

                {/* Verify current → Verify OTP → Save (single button, 3 stages) */}
                <button
                    type="button"
                    onClick={currentPasswordVerified ? handleSave : verifyCurrentPassword}
                    disabled={
                        !currentPasswordVerified
                            ? (verifyingCurrentPassword || !currentPassword)
                            : !otpVerified
                                ? (verifyingOtp || otp.join("").length !== 4)
                                : submitting
                    }
                    className="w-fit bg-[#f1f1f1] max-md:bg-[#0000f4] rounded-full px-10 py-4 focus:outline-none mt-40 cursor-pointer hover:bg-[#0000f4] active:bg-[#f1f1f1] transition-colors flex justify-center group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#f1f1f1] max-md:disabled:hover:bg-[#0000f4]"
                >
                    <SvgText
                        text={
                            !currentPasswordVerified
                                ? (verifyingCurrentPassword ? "Verifying..." : "Verify")
                                : !otpVerified
                                    ? (verifyingOtp ? "Verifying..." : "Verify")
                                    : (submitting ? "Saving..." : "Change Password")
                        }
                        weight="600"
                        height={16}
                        className="text-[#0000f4] max-md:text-white group-hover:text-white max-md:group-disabled:group-hover:text-white group-disabled:group-hover:text-[#0000f4] group-active:text-[#aaaaaa]"
                    />
                </button>
            </div>
        </main>
    );
}
