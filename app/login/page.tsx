"use client";
import { Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../components/text/SvgText";
import { SvgInput } from "../components/text/SvgInput";
import { PasswordToggle } from "../components/form/PasswordToggle";
import { useLoginForm } from "./hooks/useLoginForm";
import { RightArrow } from "../components/icons/action/RightArrow";
import { Squircle } from "../components/layout/Squircle";

const SPRING = { type: "spring", stiffness: 280, damping: 28 } as const;

function LoginPageInner() {
    const {
        email, setEmail,
        password, setPassword,
        otp,
        pendingMfaToken,
        focusedOtpIdx, setFocusedOtpIdx,
        showPassword, setShowPassword,
        submitting,
        sendingOtp,
        message,
        emailWrapRef,
        passwordWrapRef,
        otpWrapRef,
        sendOtp,
        handleSubmit,
        handleOtpChange,
        handleOtpKeyDown,
        handleFocus,
        handleBlur,
        indicatorTop,
        isOtp,
        otpCode,
        resendCountdown,
        isFocused,
        verified,
    } = useLoginForm();

    return (
        <main className="flex-1 flex items-center justify-center relative">
            <form
                onSubmit={handleSubmit}
                className="relative flex flex-col items-center gap-6 w-[min(100vw-2rem,320px)]"
            >
                <div className="flex items-center gap-3 self-start">
                    <div className="w-[8px] h-[8px] bg-[#aaaaaa] rounded-full shrink-0" aria-hidden />
                    <SvgText
                        text="Log into Axceal Account"
                        weight="600"
                        height={20}
                        className="text-[#1e1e1e]"
                    />
                </div>

                <div
                    className={`absolute left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none transition-all duration-200 ease-in-out ${message?.kind === "error" ? "bg-[#ff0000]" : "bg-[#0000f4]"}`}
                    style={{
                        top: indicatorTop !== null ? `${indicatorTop}px` : undefined,
                        opacity: isFocused && indicatorTop !== null ? 1 : 0,
                    }}
                />

                <div ref={emailWrapRef} className="w-full flex flex-col gap-2">
                    <SvgInput
                        id="login-email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={setEmail}
                        weight="500"
                        align="center"
                        height={18}
                        readOnly={isOtp}
                        className={`w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full px-8 py-4 transition-all ${isOtp ? "opacity-70" : ""}`}
                        onFocus={() => handleFocus("email")}
                        onBlur={handleBlur}
                    />
                    {message?.field === "email" && (
                        <SvgText text={message.text} weight="500" height={14} maxWidth={Infinity} className="text-[#ff0000] self-center mt-2" />
                    )}
                </div>

                <div ref={passwordWrapRef} className="w-full flex flex-col gap-2">
                    <SvgInput
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={setPassword}
                        weight="500"
                        align="center"
                        height={18}
                        readOnly={isOtp}
                        className={`w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full pl-8 pr-1 py-1 transition-all ${isOtp ? "opacity-70" : ""}`}
                        onFocus={() => handleFocus("password")}
                        onBlur={handleBlur}
                        rightSlot={
                            <PasswordToggle
                                shown={showPassword}
                                onToggle={() => setShowPassword(s => !s)}
                            />
                        }
                    />
                    {message?.field === "password" && (
                        <SvgText text={message.text} weight="500" height={14} maxWidth={Infinity} className="text-[#ff0000] self-center" />
                    )}
                </div>

                <div className="flex items-center justify-center text-center empty:hidden min-h-[16px]">
                    {message && !message.field && (
                        <SvgText
                            text={message.text}
                            weight="500"
                            height={14}
                            align="center"
                            maxWidth={Infinity}
                            className={message.kind === "error" ? "text-[#ff0000]" : "text-[#0000f4]"}
                        />
                    )}
                </div>

                {/* Same slot: Forgot Password (credentials stage) ↔ OTP field (otp stage) */}
                <div className="w-full flex flex-col items-center -mt-[15px]">
                    <AnimatePresence mode="wait" initial={false}>
                        {!isOtp ? (
                            <motion.div
                                key="forgot"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={SPRING}
                                className="flex flex-row items-center justify-between w-full py-2 px-3"
                            >
                                <Link
                                    href="/forgot-password"
                                    className="hover:opacity-90 transition-opacity"
                                >
                                    <SvgText
                                        text="Forgot Password"
                                        weight="600"
                                        height={14}
                                        className="text-[#0000f4]"
                                    />
                                </Link>
                                <div className="w-[8px] h-[8px] bg-[#aaaaaa] rounded-full shrink-0" aria-hidden />
                                <Link
                                    href="/create-account"
                                    className="hover:opacity-90 transition-opacity"
                                >
                                    <SvgText
                                        text="Create Axceal Account"
                                        weight="600"
                                        height={14}
                                        className="text-[#0000f4]"
                                    />
                                </Link>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="otp"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={SPRING}
                                className="w-full flex flex-col gap-5 pt-2"
                            >
                                <SvgText
                                    text="Check your Email for code"
                                    weight="600"
                                    height={16}
                                    className="text-[#aaaaaa] self-start pl-2 mt-[10px]"
                                />

                                <div ref={otpWrapRef} className="relative w-full pt-6 pb-6 px-6 flex flex-col gap-4">
                                    <Squircle borderRadius={20} smoothing={60} className="absolute inset-0 bg-[#f1f1f1] -z-10" />
                                    <div className="flex justify-between items-center w-full px-1 h-[16px]">
                                        <SvgText text="Verify Code" weight="600" height={16} className="text-[#aaaaaa]" />
                                        <div className="flex items-center gap-1">
                                            {verified ? (
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
                                                    onClick={() => sendOtp(pendingMfaToken!)}
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
                                                    key={`login-otp-${i}`}
                                                    onClick={() => !submitting && document.getElementById(`login-otp-digit-${i}`)?.focus()}
                                                    className={`w-[56px] h-[56px] rounded-full bg-white flex items-center justify-center shrink-0 transition-all overflow-hidden ${submitting ? "cursor-not-allowed opacity-60" : "cursor-text"} ${isActive && !submitting ? "border-[2px] border-[#0000f4]" : ""}`}
                                                >
                                                    <SvgInput
                                                        id={`login-otp-digit-${i}`}
                                                        value={digit}
                                                        onChange={(val) => handleOtpChange(i, val)}
                                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                                        onFocus={() => { handleFocus("otp"); setFocusedOtpIdx(i); }}
                                                        onBlur={handleBlur}
                                                        readOnly={submitting}
                                                        height={18}
                                                        weight="600"
                                                        align="center"
                                                        cursorHeightScale={1.5}
                                                        cursorColor="#0000f4"
                                                        className={`text-[#1e1e1e] w-full text-center bg-transparent ${submitting ? "cursor-not-allowed" : ""}`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {message?.field === "otp" && (
                                    <div className="self-center">
                                        <SvgText
                                            text={message.text}
                                            weight="500"
                                            height={14}
                                            maxWidth={Infinity}
                                            className="text-[#ff0000]"
                                        />
                                    </div>
                                )}


                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                <button
                    id="login-submit"
                    type="submit"
                    disabled={submitting || (isOtp && otpCode.length !== 4)}
                    className="w-fit bg-[#f1f1f1] mt-[50px] rounded-full px-10 py-4.5 cursor-pointer hover:bg-[#0000f4] transition-colors flex justify-center group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#f1f1f1]"
                >
                    <SvgText
                        text={
                            submitting
                                ? isOtp ? "Logging in..." : "Verifying..."
                                : isOtp ? "Login" : "Submit"
                        }
                        weight="600"
                        height={16}

                        className="text-[#0000f4] group-hover:text-white"
                    />
                </button>
            </form>

            {/* {!isOtp && (
                <div className="absolute bottom-8 w-[min(100vw-2rem,320px)] bg-[#f1f1f1] rounded-full pl-8 pr-1 py-1 flex items-center justify-between group">
                    <SvgText
                        text="New to Axceal account"
                        weight="600"
                        height={16}
                        className="text-[#1e1e1e]"
                    />
                    <Link
                        href="/create-account"
                        className="bg-[#0000f4] rounded-full aspect-square h-[42px] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                    >
                        <RightArrow className="text-white ml-1 w-[10px] h-auto" />
                    </Link>
                </div>
            )} */}
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<main className="flex-1" />}>
            <LoginPageInner />
        </Suspense>
    );
}
