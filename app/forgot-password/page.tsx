"use client";
import { Suspense } from "react";
import Link from "next/link";
import { SvgText } from "../components/text/SvgText";
import { SvgInput } from "../components/text/SvgInput";
import { PasswordConstraints } from "../components/form/PasswordConstraints";
import { RightArrow } from "@/app/components/icons/action/RightArrow";
import { OtpSection } from "../components/form/OtpSection";
import { AnimatedPasswordField } from "../components/form/AnimatedPasswordField";
import { motion, AnimatePresence } from "framer-motion";
import { useForgotPasswordForm } from "./hooks/useForgotPasswordForm";
import { Squircle } from "@/app/components/layout/Squircle";

const LAYOUT_ID = "forgot-password-indicator";

function ForgotPasswordForm() {
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
        verifyingOtp,
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
        otpVerified,
        passwordValid,
        prefilled,
        recentlySent,
        isFocused,
    } = useForgotPasswordForm();

    return (
        <main className="flex-1 flex items-center justify-center">
            <form
                onSubmit={handleSubmit}
                className="relative flex flex-col items-center gap-5 w-[300px]"
            >
                {/* Mobile Back Button */}
                <div className="flex lg:hidden w-full items-center justify-start mb-[5px]">
                    <Link href="/login" className="flex items-center w-fit shrink-0 whitespace-nowrap">
                        <SvgText text="Back" weight="600" height={16} className="text-[#1e1e1e] " />
                    </Link>
                </div>

                <div className="relative flex items-center justify-center w-full">
                    {/* Desktop Back Button */}
                    <Link href="/login" className="hidden lg:flex absolute right-full mr-[30px] top-[22px] whitespace-nowrap">
                        <SvgText text="Back" weight="600" height={16} className="text-[#1e1e1e] " />
                    </Link>
                    <Squircle
                        smoothing={60}
                        borderRadius={15}
                        className="w-full bg-[#0000f4] px-10 py-5 flex justify-center"
                        aria-hidden
                    >
                        <SvgText text="Forgot Password" weight="600" height={14} className="text-white" />
                    </Squircle>
                </div>

                {!prefilled && (
                    <div className="w-full flex flex-col items-start text-left gap-[4px] mt-1">
                        <SvgText
                            text={"Email address to which Axceal account\nis connected"}
                            weight="600"
                            height={16}
                            className="text-[#aaaaaa]"
                        />
                    </div>
                )}

                {/* Email + Send OTP. When prefilled, render the input read-only
                    without the Send button — the email + OTP were already
                    verified on the create-account page. */}
                <div className="w-full flex flex-col gap-2">
                    <div className="w-full relative">
                        {!prefilled && activeField === "email" && isFocused && (
                            <motion.div
                                layoutId={LAYOUT_ID}
                                className={`absolute -top-[2.5px] left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none z-10 ${message?.kind === "error" ? "bg-[#ff0000]" : "bg-[#0000f4]"}`}
                                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                            />
                        )}
                        <SvgInput
                            id="fp-email"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={setEmail}
                            readOnly={prefilled || otpVerified}
                            weight="600"
                            height={prefilled ? 16 : 14}
                            align="center"
                            className={`w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full pl-8 pr-[5px] py-1 transition-all ${prefilled || otpVerified ? "opacity-60 cursor-not-allowed" : ""}`}
                            onFocus={() => handleFocus("email")}
                            onBlur={handleBlur}
                            rightSlot={
                                !prefilled ? (
                                    <button
                                        type="button"
                                        id="send-otp-btn"
                                        onClick={handleSendOtp}
                                        disabled={sendingOtp || otpVerified}
                                        className="bg-[#0000f4] rounded-full aspect-square h-[42px] cursor-pointer hover:opacity-90 transition-opacity shrink-0 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#aaaaaa]"
                                    >
                                        <RightArrow className="text-white w-[10px] ml-1 h-auto" />
                                    </button>
                                ) : undefined
                            }
                        />
                    </div>
                    {!prefilled && message?.field === "email" && (
                        <SvgText text={message.text} weight="500" height={14} className="text-[#ff0000] self-center" />
                    )}
                </div>

                {!prefilled && (
                    <>
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
                            recentlySent={recentlySent}
                            isFocused={isFocused}
                            disabled={otpVerified}
                        />
                        {message?.field === "otp" && (
                            <SvgText text={message.text} weight="500" height={14} className="text-[#ff0000] self-center -mt-3" />
                        )}
                    </>
                )}

                <AnimatedPasswordField
                    show={otpVerified}
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
                    isFocused={isFocused}
                />
                {otpVerified && message?.field === "password" && (
                    <SvgText text={message.text} weight="500" height={14} className="text-[#ff0000] self-center -mt-3" />
                )}

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
                    isFocused={isFocused}
                />
                {passwordValid && message?.field === "repassword" && (
                    <SvgText text={message.text} weight="500" height={14} className="text-[#ff0000] self-center" />
                )}

                {/* General (network/server) errors only */}
                <div className="flex items-center justify-center text-center empty:hidden min-h-[16px]">
                    {message && !message.field && (
                        <SvgText
                            text={message.text}
                            weight="600"
                            height={12}
                            className={message.kind === "error" ? "text-[#ff0000]" : "text-[#0000f4]"}
                        />
                    )}
                </div>

                {(prefilled || otpSent) && (
                    <button
                        id="fp-submit"
                        type="submit"
                        disabled={
                            submitting
                            || verifyingOtp
                            || (!prefilled && !otpVerified && otp.join("").length !== 4)
                            || (otpVerified && !formValid)
                        }
                        className="w-fit bg-[#f1f1f1] rounded-full px-10 py-4.5 cursor-pointer hover:bg-[#0000f4] transition-colors flex justify-center group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#f1f1f1]"
                    >
                        <SvgText
                            text={
                                !prefilled && !otpVerified
                                    ? (verifyingOtp ? "Verifying..." : "Verify")
                                    : (submitting ? "Saving..." : "Save")
                            }
                            weight="600"
                            height={16}
                            className="text-[#aaaaaa] group-hover:text-white group-disabled:group-hover:text-[#aaaaaa]"
                        />
                    </button>
                )}
            </form>
        </main>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense>
            <ForgotPasswordForm />
        </Suspense>
    );
}
