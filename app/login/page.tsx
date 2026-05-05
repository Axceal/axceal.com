"use client";
import { Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../components/SvgText";
import { SvgInput } from "../components/SvgInput";
import { PasswordToggle } from "../components/PasswordToggle";
import { useLoginForm } from "./hooks/useLoginForm";

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
    } = useLoginForm();

    return (
        <main className="flex-1 flex items-center justify-center">
            <form
                onSubmit={handleSubmit}
                className="relative flex flex-col items-center gap-6 w-[min(100vw-2rem,300px)]"
            >
                <SvgText
                    text="Log into Axceal Account"
                    weight="600"
                    height={20}
                    className="text-[#1e1e1e] flex self-start"
                />

                <div
                    className={`absolute left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none transition-all duration-200 ease-in-out ${message?.kind === "error" ? "bg-[#ff0000]" : "bg-[#0000f4]"}`}
                    style={{
                        top: indicatorTop !== null ? `${indicatorTop}px` : undefined,
                        opacity: indicatorTop !== null ? 1 : 0,
                    }}
                />

                <div ref={emailWrapRef} className="w-full">
                    <SvgInput
                        id="login-email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={setEmail}
                        weight="500"
                        align="center"
                        height={16}
                        readOnly={isOtp}
                        className={`w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full px-8 py-4 transition-all ${isOtp ? "opacity-70" : ""}`}
                        onFocus={() => handleFocus("email")}
                        onBlur={handleBlur}
                    />
                </div>

                <div ref={passwordWrapRef} className="w-full">
                    <SvgInput
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={setPassword}
                        weight="500"
                        align="center"
                        height={16}
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
                </div>

                <div className="flex items-center justify-center text-center empty:hidden min-h-[24px]">
                    {message && (
                        <SvgText
                            text={message.text}
                            weight="500"
                            height={14}
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
                            >
                                <Link
                                    href="/forgot-password"
                                    className="rounded-full px-5 py-3 flex justify-center hover:opacity-90 transition-opacity"
                                >
                                    <SvgText
                                        text="Forgot Password"
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
                                className="w-full flex flex-col gap-5 pt-1"
                            >
                                <SvgText
                                    text="Check your Email for code"
                                    weight="600"
                                    height={16}
                                    className="text-[#aaaaaa] self-start pl-2 mt-[10px]"
                                />

                                <div
                                    ref={otpWrapRef}
                                    className="bg-[#f1f1f1] rounded-[15px] h-[72px] px-5 py-3 flex items-center justify-between w-full"
                                >
                                    <SvgText
                                        text="Verify"
                                        weight="600"
                                        height={14}
                                        className="text-[#aaaaaa]"
                                    />
                                    <div className="flex gap-1 sm:gap-2">
                                        {otp.map((digit, i) => (
                                            <div
                                                key={`login-otp-${i}`}
                                                onClick={() => document.getElementById(`login-otp-digit-${i}`)?.focus()}
                                                className={`w-10 h-10 rounded-full bg-white flex shrink-0 transition-all cursor-text ${focusedOtpIdx === i ? "ring-2 ring-[#0000f4]" : ""}`}
                                            >
                                                <SvgInput
                                                    id={`login-otp-digit-${i}`}
                                                    value={digit}
                                                    onChange={(val) => handleOtpChange(i, val)}
                                                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                                    onFocus={() => { handleFocus("otp"); setFocusedOtpIdx(i); }}
                                                    onBlur={handleBlur}
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
                                    onClick={() => pendingMfaToken && sendOtp(pendingMfaToken)}
                                    disabled={sendingOtp || !pendingMfaToken}
                                    className="cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none self-center"
                                    aria-label="Resend OTP"
                                >
                                    <SvgText
                                        text={sendingOtp ? "Sending..." : "Resend"}
                                        weight="600"
                                        height={14}
                                        className="text-[#0000f4]"
                                    />
                                </button>
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

                {/* <SvgText text="or" weight="600" height={16} className="text-[#1e1e1e]" />

                <Link
                    href="/create-account"
                    id="go-to-create-account"
                    className="w-fit bg-[#f1f1f1] rounded-full px-8 py-4.5 cursor-pointer hover:bg-[#0000f4] transition-colors flex justify-center group"
                >
                    <SvgText text="Create Axceal Account" weight="600" height={16} className="text-[#0000f4] group-hover:text-white" />
                </Link> */}
            </form>
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
