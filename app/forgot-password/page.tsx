"use client";
import Link from "next/link";
import { SvgText } from "../components/SvgText";
import { SvgInput } from "../components/SvgInput";
import { PasswordConstraints } from "../components/PasswordConstraints";
import { OtpSection } from "../components/OtpSection";
import { AnimatedPasswordField } from "../components/AnimatedPasswordField";
import { motion, AnimatePresence } from "framer-motion";
import { useForgotPasswordForm } from "./hooks/useForgotPasswordForm";

const LAYOUT_ID = "forgot-password-indicator";

export default function ForgotPasswordPage() {
    const {
        email, setEmail,
        otp,
        password, setPassword,
        rePassword, setRePassword,
        activeField,
        focusedOtpIdx, setFocusedOtpIdx,
        showPassword, setShowPassword,
        showRePassword, setShowRePassword,
        sendingOtp,
        otpSent,
        submitting,
        message,
        handleSendOtp,
        handleOtpChange,
        handleOtpKeyDown,
        handleSubmit,
        handleFocus,
        handleBlur,
        formValid,
        isLengthValid,
        hasSpecialChar,
        hasUpper,
        hasDigit,
        hasAnyConstraint,
        otpComplete,
        passwordValid,
    } = useForgotPasswordForm();

    return (
        <main className="flex-1 flex items-center justify-center">
            <form
                onSubmit={handleSubmit}
                className="relative flex flex-col items-center gap-5 w-[300px]"
            >
                <Link
                    href="/login"
                    className="absolute right-full mr-[30px] top-[18px]"
                >
                    <SvgText text="Back" weight="600" height={16} className="text-[#1e1e1e]" />
                </Link>

                <div
                    className="w-full bg-[#0000f4] rounded-[16px] px-10 py-5 flex justify-center"
                    aria-hidden
                >
                    <SvgText text="Forgot Password" weight="600" height={14} className="text-white" />
                </div>

                <div className="w-full flex flex-col items-start text-left gap-[4px] mt-1">
                    <SvgText
                        text={"Email address to which Axceal account\nis connected"}
                        weight="600"
                        height={16}
                        className="text-[#aaaaaa]"
                    />
                </div>

                {/* Email + Send OTP */}
                <div className="w-full relative">
                    {activeField === "email" && (
                        <motion.div
                            layoutId={LAYOUT_ID}
                            className={`absolute -top-[2.5px] left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none z-10 ${message?.kind === "error" ? "bg-[#e11d48]" : "bg-[#0000f4]"}`}
                            transition={{ type: "spring", stiffness: 280, damping: 28 }}
                        />
                    )}
                    <SvgInput
                        id="fp-email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={setEmail}
                        weight="600"
                        height={14}
                        className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full pl-8 pr-1.5 py-1.5 transition-all"
                        onFocus={() => handleFocus("email")}
                        onBlur={handleBlur}
                        rightSlot={
                            <button
                                type="button"
                                id="fp-send-otp-btn"
                                onClick={handleSendOtp}
                                disabled={sendingOtp || !email}
                                className="bg-[#aaaaaa] text-white font-semibold rounded-full px-5 py-3 cursor-pointer hover:bg-[#0000f4] transition-colors shrink-0 flex items-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#aaaaaa]"
                            >
                                <SvgText text={sendingOtp ? "Sending..." : "Send"} weight="600" height={14} className="text-white h-full" />
                            </button>
                        }
                    />
                </div>

                <OtpSection
                    otpSent={otpSent}
                    otp={otp}
                    activeField={activeField}
                    focusedOtpIdx={focusedOtpIdx}
                    handleOtpChange={handleOtpChange}
                    handleOtpKeyDown={handleOtpKeyDown}
                    onDigitFocus={(i) => { handleFocus("otp"); setFocusedOtpIdx(i); }}
                    onDigitBlur={handleBlur}
                    sendingOtp={sendingOtp}
                    email={email}
                    handleSendOtp={handleSendOtp}
                    message={message}
                    layoutId={LAYOUT_ID}
                    otpIdPrefix="fp-otp-digit"
                    otpKeyPrefix="fp-otp"
                />

                <AnimatedPasswordField
                    show={otpComplete}
                    id="fp-password"
                    placeholder="New Password"
                    value={password}
                    onChange={setPassword}
                    shown={showPassword}
                    onToggle={() => setShowPassword(s => !s)}
                    activeField={activeField}
                    fieldName="password"
                    onFocus={() => handleFocus("password")}
                    onBlur={handleBlur}
                    layoutId={LAYOUT_ID}
                    message={message}
                />

                {/* Password constraints */}
                <AnimatePresence initial={false}>
                    {otpComplete && activeField === "password" && hasAnyConstraint && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex flex-col items-center w-full mt-[-10px] overflow-hidden"
                        >
                            <PasswordConstraints
                                isLengthValid={isLengthValid}
                                hasSpecialChar={hasSpecialChar}
                                hasUpper={hasUpper}
                                hasDigit={hasDigit}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatedPasswordField
                    show={passwordValid}
                    id="fp-repassword"
                    placeholder="Re-Enter new Password"
                    value={rePassword}
                    onChange={setRePassword}
                    shown={showRePassword}
                    onToggle={() => setShowRePassword(s => !s)}
                    activeField={activeField}
                    fieldName="repassword"
                    onFocus={() => handleFocus("repassword")}
                    onBlur={handleBlur}
                    layoutId={LAYOUT_ID}
                    message={message}
                />

                <div className="h-[40px] flex items-center justify-center text-center">
                    {message && (
                        <SvgText
                            text={message.text}
                            weight="600"
                            height={12}
                            className={message.kind === "error" ? "text-[#e11d48]" : "text-[#0000f4]"}
                        />
                    )}
                </div>

                <button
                    id="fp-submit"
                    type="submit"
                    disabled={!formValid || submitting || !otpSent}
                    className="w-fit bg-[#f1f1f1] rounded-full px-10 py-4.5 cursor-pointer hover:bg-[#0000f4] transition-colors flex justify-center group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#f1f1f1]"
                >
                    <SvgText
                        text={submitting ? "Submitting..." : "Proceed"}
                        weight="600"
                        height={16}
                        className="text-[#aaaaaa] group-hover:text-white group-disabled:group-hover:text-[#aaaaaa]"
                    />
                </button>
            </form>
        </main>
    );
}
