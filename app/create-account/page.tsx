"use client";
import { Suspense } from "react";
import { SvgText } from "../components/text/SvgText";
import { SvgInput } from "../components/text/SvgInput";
import { PasswordConstraints } from "../components/form/PasswordConstraints";
import { RightArrow } from "@/app/components/icons/action/RightArrow";
import { OtpSection } from "../components/form/OtpSection";
import { AnimatedPasswordField } from "../components/form/AnimatedPasswordField";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateAccountForm } from "./hooks/useCreateAccountForm";
import { elideEmail } from "@/lib/format";
import { Squircle } from "../components/layout/Squircle";

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
        verifyingOtp,
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
        emailExists,
        emailExistsFor,
        handleOtpLogin,
        handleForgotPassword,
        otpLoginInProgress,
        recentlySent,
        isFocused,
    } = useCreateAccountForm();

    return (
        <main className="flex-1 flex items-center justify-center">
            <form
                onSubmit={handleSubmit}
                className="relative flex flex-col items-center gap-5 w-[min(100vw-2rem,320px)]"
            >
                <div className="flex items-center gap-3 self-start mb-2">
                    <div className="w-[8px] h-[8px] bg-[#aaaaaa] rounded-full shrink-0" aria-hidden />
                    <SvgText
                        text="Creating Axceal Account"
                        weight="600"
                        height={20}
                        className="text-[#1e1e1e]"
                    />
                </div>

                {/* Email + Send OTP */}
                <div className="w-full flex flex-col gap-2">
                    <div className="w-full relative">
                        {activeField === "email" && isFocused && (
                            <motion.div
                                layoutId={LAYOUT_ID}
                                className={`absolute -top-[2.5px] left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none z-10 ${message?.kind === "error" ? "bg-[#ff0000]" : "bg-[#0000f4]"}`}
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
                            className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full pl-8 pr-[5px] py-1 transition-all"
                            onFocus={() => handleFocus("email")}
                            onBlur={handleBlur}
                            rightSlot={
                                <button
                                    type="button"
                                    id="send-otp-btn"
                                    onClick={handleSendOtp}
                                    disabled={sendingOtp}
                                    className="bg-[#0000f4] rounded-full aspect-square h-[42px] cursor-pointer hover:opacity-90 transition-opacity shrink-0 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#aaaaaa]"
                                >
                                    <RightArrow className="text-white ml-1 w-[10px] h-auto" />
                                </button>
                            }
                        />
                    </div>
                    {!emailExists && message?.field === "email" && (
                        <SvgText text={message.text} weight="500" align="center" height={14} className="text-[#ff0000] self-center" />
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
                    recentlySent={recentlySent}
                    isFocused={isFocused}
                />
                {message?.field === "otp" && (
                    <SvgText text={message.text} align="center" weight="500" height={14} className="text-[#ff0000] self-center -mt-3" />
                )}

                {emailExists && (
                    <div className="w-full flex flex-col items-stretch gap-[10px] mt-2">
                        <Squircle borderRadius={20} smoothing={50} className="w-full bg-[#f1f1f1] py-8 px-6 flex flex-col items-center gap-2">
                            <SvgText
                                text="Account already exists for"
                                weight="500"
                                height={16}
                                maxWidth={Infinity}
                                className="text-[#aaaaaa]"
                            />
                            <SvgText
                                text={elideEmail(emailExistsFor)}
                                weight="500"
                                height={16}
                                maxWidth={Infinity}
                                className="text-[#0000f4]"
                            />
                        </Squircle>
                        <div className="w-full bg-[#f1f1f1] rounded-full p-1 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={handleOtpLogin}
                                disabled={otpLoginInProgress}
                                className="bg-[#0000f4] rounded-full px-8 py-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <SvgText
                                    text={otpLoginInProgress ? "in..." : "Login"}
                                    weight="600"
                                    height={16}
                                    className="text-white"
                                />
                            </button>
                            <span className="w-[10px] aspect-square rounded-full bg-[#aaaaaa]" aria-hidden />
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="bg-[#0000f4] rounded-full px-7 py-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                            >
                                <SvgText text="Forgot Password" weight="600" height={16} className="text-white" />
                            </button>
                        </div>
                    </div>
                )}

                {!emailExists && (<>
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
                        isFocused={isFocused}
                    />
                    {otpVerified && message?.field === "password" && (
                        <SvgText text={message.text} weight="500" align="center" height={14} className="text-[#ff0000] self-center -mt-3" />
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
                        isFocused={isFocused}
                    />
                    {passwordValid && message?.field === "repassword" && (
                        <SvgText text={message.text} weight="500" height={14} align="center" className="text-[#ff0000] self-center" />
                    )}

                    {/* General (network/server) errors only */}
                    <div className="h-[40px] flex items-center justify-center text-center">
                        {message && !message.field && (
                            <SvgText
                                text={message.text}
                                weight="600"
                                height={12}
                                className={message.kind === "error" ? "text-[#ff0000]" : "text-[#0000f4]"}
                            />
                        )}
                    </div>

                    {otpSent && (
                        <button
                            id="create-account-submit"
                            type="submit"
                            disabled={submitting || verifyingOtp || (!otpVerified && otp.join("").length !== 4)}
                            className="w-fit bg-[#f1f1f1] rounded-full px-10 py-4.5 cursor-pointer hover:bg-[#0000f4] transition-colors flex justify-center group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#f1f1f1]"
                        >
                            <SvgText
                                text={
                                    !otpVerified
                                        ? (verifyingOtp ? "Verifying..." : "Verify")
                                        : (submitting ? "Saving..." : "Save")
                                }
                                weight="600"
                                height={16}
                                className="text-[#aaaaaa] group-hover:text-white group-disabled:group-hover:text-[#aaaaaa]"
                            />
                        </button>
                    )}
                </>)}
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
