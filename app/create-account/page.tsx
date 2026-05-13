"use client";
import { Suspense } from "react";
import { SvgText } from "../components/SvgText";
import { SvgInput } from "../components/SvgInput";
import { PasswordConstraints } from "../components/PasswordConstraints";
import { OtpSection } from "../components/OtpSection";
import { AnimatedPasswordField } from "../components/AnimatedPasswordField";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateAccountForm } from "./hooks/useCreateAccountForm";

const LAYOUT_ID = "create-account-indicator";

function CreateAccountForm() {
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
        otpWrapRef,
        handleSendOtp,
        handleOtpChange,
        handleOtpKeyDown,
        handleSubmit,
        handleFocus,
        handleBlur,
        isLengthValid,
        hasSpecialChar,
        hasUpper,
        hasDigit,
        hasAnyConstraint,
        otpVerified,
        passwordValid,
    } = useCreateAccountForm();

    return (
        <main className="flex-1 flex items-center justify-center">
            <form
                onSubmit={handleSubmit}
                className="relative flex flex-col items-center gap-5 w-[min(100vw-2rem,320px)]"
            >
                <SvgText
                    text="Creating Axceal Account"
                    weight="600"
                    height={20}
                    className="text-[#1e1e1e] flex self-start mb-2"
                />

                {/* Email + Send OTP */}
                <div className="w-full flex flex-col gap-2">
                    <div className="w-full relative">
                        {activeField === "email" && (
                            <motion.div
                                layoutId={LAYOUT_ID}
                                className={`absolute -top-[2.5px] left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none z-10 ${message?.kind === "error" ? "bg-[#e11d48]" : "bg-[#0000f4]"}`}
                                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                            />
                        )}
                        <SvgInput
                            id="create-account-email"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={setEmail}
                            weight="600"
                            height={16}
                            className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full pl-8 pr-1 py-1 transition-all"
                            onFocus={() => handleFocus("email")}
                            onBlur={handleBlur}
                            rightSlot={
                                <button
                                    type="button"
                                    id="send-otp-btn"
                                    onClick={handleSendOtp}
                                    disabled={sendingOtp}
                                    className="bg-[#aaaaaa] text-white font-semibold rounded-full px-6 py-3.5 cursor-pointer hover:bg-[#0000f4] transition-colors shrink-0 flex items-center disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#aaaaaa]"
                                >
                                    <SvgText text={sendingOtp ? "Sending..." : "Send"} weight="600" height={14} className="text-white h-full" />
                                </button>
                            }
                        />
                    </div>
                    {message?.field === "email" && (
                        <SvgText text={message.text} weight="500" height={14} className="text-[#e11d48] self-center" />
                    )}
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
                    otpIdPrefix="otp-digit"
                    otpKeyPrefix="otp"
                    gapClass="gap-2 sm:gap-2"
                    otpWrapRef={otpWrapRef}
                />
                {message?.field === "otp" && (
                    <SvgText text={message.text} weight="500" height={14} className="text-[#e11d48] self-center -mt-3" />
                )}

                <AnimatedPasswordField
                    show={otpVerified}
                    id="create-account-password"
                    placeholder="Password"
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
                {otpVerified && message?.field === "password" && (
                    <SvgText text={message.text} weight="500" height={14} className="text-[#e11d48] self-center -mt-3" />
                )}

                {/* Password constraints */}
                <AnimatePresence initial={false}>
                    {otpVerified && activeField === "password" && hasAnyConstraint && (
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
                    id="create-account-repassword"
                    placeholder="Re-Enter Password"
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
                {passwordValid && message?.field === "repassword" && (
                    <SvgText text={message.text} weight="500" height={14} className="text-[#e11d48] self-center" />
                )}

                {/* General (network/server) errors only */}
                <div className="h-[40px] flex items-center justify-center text-center">
                    {message && !message.field && (
                        <SvgText
                            text={message.text}
                            weight="600"
                            height={12}
                            className={message.kind === "error" ? "text-[#e11d48]" : "text-[#0000f4]"}
                        />
                    )}
                </div>

                <button
                    id="create-account-submit"
                    type="submit"
                    disabled={submitting}
                    className="w-fit bg-[#f1f1f1] rounded-full px-10 py-4.5 cursor-pointer hover:bg-[#0000f4] transition-colors flex justify-center group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#f1f1f1]"
                >
                    <SvgText text={submitting ? "Creating..." : "Next"} weight="600" height={16} className="text-[#aaaaaa] group-hover:text-white group-disabled:group-hover:text-[#aaaaaa]" />
                </button>
            </form>
        </main>
    );
}

export default function CreateAccountPage() {
    return (
        <Suspense>
            <CreateAccountForm />
        </Suspense>
    );
}
