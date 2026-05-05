"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { apiFetch } from "@/lib/http/client";

type ActiveField = "otp" | "password" | "repassword";

const GAP = 2.5;

export function useChangePasswordForm() {
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [focusedOtpIdx, setFocusedOtpIdx] = useState(-1);
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showRePassword, setShowRePassword] = useState(false);
    const [activeField, setActiveField] = useState<ActiveField>("otp");
    const [sendingOtp, setSendingOtp] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);

    const otpWrapRef = useRef<HTMLDivElement>(null);
    const passwordWrapRef = useRef<HTMLDivElement>(null);
    const repasswordWrapRef = useRef<HTMLDivElement>(null);

    const [, forceUpdate] = useState(0);
    useEffect(() => { forceUpdate(n => n + 1); }, []);

    const sendOtp = useCallback(async () => {
        if (sendingOtp) return;
        setSendingOtp(true);
        try {
            const res = await apiFetch("/api/account/send-otp", { method: "POST" });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setMessage({ kind: "error", text: body?.error?.message ?? "Could not send OTP." });
            }
        } catch {
            setMessage({ kind: "error", text: "Network error." });
        } finally {
            setSendingOtp(false);
        }
    }, [sendingOtp]);

    // Auto-send OTP on mount so the user sees "Check your Email for OTP" immediately
    const hasSentRef = useRef(false);
    useEffect(() => {
        if (hasSentRef.current) return;
        hasSentRef.current = true;
        void sendOtp();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isLengthValid = password.length >= 8 && password.length <= 64;
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const otpComplete = otp.join("").length === 4;
    const passwordValid = isLengthValid && hasSpecialChar && hasUpper && hasDigit;

    const handleOtpChange = (index: number, value: string) => {
        const v = value.replace(/\D/g, "").slice(-1);
        const updated = [...otp];
        updated[index] = v;
        setOtp(updated);
        if (v && index < 3) {
            setTimeout(() => document.getElementById(`change-pw-otp-digit-${index + 1}`)?.focus(), 10);
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            setTimeout(() => document.getElementById(`change-pw-otp-digit-${index - 1}`)?.focus(), 10);
        }
    };

    const handleSave = async () => {
        if (submitting) return;
        const otpCode = otp.join("");
        if (otpCode.length !== 4) {
            setMessage({ kind: "error", text: "Enter the 4-digit OTP." });
            return;
        }
        if (!password) {
            setMessage({ kind: "error", text: "Enter new password." });
            return;
        }
        if (!isLengthValid || !hasSpecialChar || !hasUpper || !hasDigit) {
            setMessage({ kind: "error", text: "Password does not meet requirements." });
            return;
        }
        if (password !== rePassword) {
            setMessage({ kind: "error", text: "Passwords do not match." });
            return;
        }
        setSubmitting(true);
        setMessage(null);
        try {
            const res = await apiFetch("/api/account/change-password", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ otp: otpCode, password }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setMessage({ kind: "error", text: body?.error?.message ?? "Could not change password." });
                return;
            }
            setMessage({ kind: "info", text: "Password changed successfully." });
        } catch {
            setMessage({ kind: "error", text: "Network error. Please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    const refMap: Record<ActiveField, React.RefObject<HTMLDivElement | null>> = {
        otp: otpWrapRef,
        password: passwordWrapRef,
        repassword: repasswordWrapRef,
    };
    const activeRef = refMap[activeField];
    const indicatorTop = activeRef.current ? activeRef.current.offsetTop - GAP : null;

    return {
        otp,
        focusedOtpIdx, setFocusedOtpIdx,
        password, setPassword,
        rePassword, setRePassword,
        showPassword, setShowPassword,
        showRePassword, setShowRePassword,
        activeField, setActiveField,
        sendingOtp,
        submitting,
        message,
        otpWrapRef,
        passwordWrapRef,
        repasswordWrapRef,
        otpComplete,
        passwordValid,
        sendOtp,
        handleOtpChange,
        handleOtpKeyDown,
        handleSave,
        indicatorTop,
    };
}
