import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Squircle } from "@/app/components/layout/Squircle";
import { SvgText } from "@/app/components/text/SvgText";
import { SvgInput } from "@/app/components/text/SvgInput";
import { ViewDetailsSaveIcon } from "@/app/components/icons/action/ViewDetailsSaveIcon";
import { SecuredDataIcon } from "@/app/auth/components/SecuredDataIcon";
import { apiFetch } from "@/lib/http/client";

const COUNTDOWN_SECONDS = 120;

export function OtpModal({ onClose, onSuccess, phone, firstName, lastName, gender, birthday }: { onClose: () => void; onSuccess?: () => void; phone: string; firstName?: string | null; lastName?: string | null; gender?: string | null; birthday?: string | null; }) {
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const [canResend, setCanResend] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // --- Countdown timer ---
    const startCountdown = useCallback(() => {
        setCountdown(COUNTDOWN_SECONDS);
        setCanResend(false);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setCanResend(true);
                    onClose();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // --- Send OTP (email-based) ---
    const sendOtp = useCallback(async () => {
        setErrorMsg(null);
        try {
            const res = await apiFetch("/api/account/details/send-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: "{}",
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setErrorMsg(body?.error?.message ?? "Could not send Code.");
                return;
            }
            startCountdown();
        } catch {
            setErrorMsg("Network error. Please try again.");
        }
    }, [startCountdown]);

    // Send OTP on mount (guarded against Strict Mode double-fire)
    const hasSent = useRef(false);
    useEffect(() => {
        if (!hasSent.current) {
            hasSent.current = true;
            sendOtp();
        }
    }, [sendOtp]);

    // --- Resend handler ---
    const handleResend = async () => {
        if (!canResend) return;
        setOtp(["", "", "", ""]);
        setErrorMsg(null);
        await sendOtp();
    };

    // --- Verify OTP (email-based, persists phone) ---
    const handleVerify = async () => {
        const code = otp.join("");
        if (code.length !== 4) {
            setErrorMsg("Enter the 4-digit Code.");
            return;
        }
        setVerifying(true);
        setErrorMsg(null);

        // Ensure phone is in E.164 format (+ followed by digits)
        const digits = phone.replace(/\D/g, "");
        const formattedPhone = `+${digits}`;

        try {
            const res = await apiFetch("/api/account/details/verify-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ phone: formattedPhone, code, firstName, lastName, gender, birthday }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setErrorMsg(body?.error?.message ?? "Verification failed.");
                setVerifying(false);
                return;
            }
            setVerified(true);
            setTimeout(() => {
                if (onSuccess) onSuccess();
                else onClose();
            }, 300);
        } catch {
            setErrorMsg("Network error.");
            setVerifying(false);
        }
    };

    // --- OTP input handlers ---
    const handleOtpChange = (val: string, index: number) => {
        const clean = val.replace(/\D/g, "").slice(0, 1);
        const newOtp = [...otp];
        newOtp[index] = clean;
        setOtp(newOtp);

        if (clean && index < 3) {
            setTimeout(() => {
                document.getElementById(`otp-input-${index + 1}`)?.focus();
            }, 10);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            document.getElementById(`otp-input-${index - 1}`)?.focus();
            const newOtp = [...otp];
            newOtp[index - 1] = "";
            setOtp(newOtp);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
        >
            <div
                className="absolute inset-0 bg-black/40 z-0"
            />
            <motion.div
                layout
                initial={{ opacity: 0, y: 300 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 400 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="relative z-10 flex flex-col items-center gap-[10px] w-full max-w-[320px] mx-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Pill (Message) */}
                <div className="bg-[#f1f1f1] rounded-full h-[60px] flex items-center justify-start pl-[15px] pr-[15px] w-[300px] sm:w-[320px]">
                    <SecuredDataIcon className="text-[#aaaaaa] w-[30px] h-[30px] shrink-0 mr-2" />
                    <div className="flex items-center">
                        <SvgText text="4 Digit Code sent to " weight="600" height={16} className="text-[#1e1e1e] mr-1" />
                        <SvgText text="Email" weight="600" height={16} className="text-[#0000f4]" />
                    </div>
                </div>

                {/* Main Modal */}
                <Squircle borderRadius={20} smoothing={60} className="bg-[#f1f1f1] w-[300px] sm:w-[320px] pt-6 pb-6 px-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center w-full px-1">
                        <SvgText text="Verify Code" weight="600" height={16} className="text-[#aaaaaa]" />
                        <div className="flex items-center gap-1">
                            {canResend || verified ? (
                                <button
                                    type="button"
                                    onClick={verified ? undefined : handleResend}
                                    disabled={verified}
                                    className={`focus:outline-none ${verified ? "cursor-not-allowed" : "cursor-pointer"}`}
                                >
                                    <SvgText 
                                        text={verified ? "Done" : "Resend"} 
                                        weight="600" 
                                        height={16} 
                                        className={verified ? "text-[#aaaaaa]" : "text-[#0000f4]"} 
                                        maxWidth={200} 
                                    />
                                </button>
                            ) : (
                                <>
                                    <SvgText text="Wait," weight="600" height={16} className="text-[#1e1e1e]" />
                                    <SvgText text={`${countdown}s`} weight="600" height={16} className="text-[#0000f4]" />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between w-full gap-1">
                        {[0, 1, 2, 3].map((i) => {
                            const isActive = focusedIndex === i || otp[i];
                            return (
                                <div key={i} className={`w-[56px] h-[56px] rounded-full flex items-center justify-center bg-white ${isActive ? "border-[2px] border-[#0000f4]" : ""} overflow-hidden`}>
                                    <SvgInput
                                        id={`otp-input-${i}`}
                                        value={otp[i]}
                                        onChange={(v) => handleOtpChange(v, i)}
                                        onKeyDown={(e) => handleKeyDown(e, i)}
                                        onFocus={() => setFocusedIndex(i)}
                                        onBlur={() => setFocusedIndex(null)}
                                        align="center"
                                        weight="600"
                                        height={18}
                                        cursorHeightScale={1.5}
                                        cursorColor="#0000f4"
                                        className="w-full text-center bg-transparent cursor-pointer focus:cursor-text text-[#1e1e1e]"
                                    />
                                </div>
                            );
                        })}
                    </div>
                    {errorMsg && (
                        <div className="flex justify-center mt-1">
                            <SvgText text={errorMsg} weight="600" height={14} className="text-[#ff0000]" />
                        </div>
                    )}
                </Squircle>

                {/* Confirm Button */}
                <button
                    type="button"
                    onClick={!verifying ? handleVerify : undefined}
                    className={`w-[140px] h-[50px] rounded-full bg-[#f1f1f1] flex items-center justify-center ${verifying ? "[&>*]:opacity-50" : "group cursor-pointer hover:bg-[#0000f4] transition-colors duration-250"}`}
                >
                    <ViewDetailsSaveIcon className="text-[#aaaaaa] group-hover:text-white transition-colors duration-250 w-[26px] h-[26px]" />
                </button>
            </motion.div>
        </motion.div>
    );
}
