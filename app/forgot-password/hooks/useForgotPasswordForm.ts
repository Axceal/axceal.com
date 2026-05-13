"use client";
import { useState, useRef, useCallback, useEffect } from "react";

type ActiveField = "email" | "otp" | "password" | "repassword";
type Message = { kind: "info" | "error"; text: string; field?: ActiveField | null };

export function useForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");

    const [activeField, setActiveField] = useState<ActiveField>("email");
    const [focusedOtpIdx, setFocusedOtpIdx] = useState(-1);

    const [showPassword, setShowPassword] = useState(false);
    const [showRePassword, setShowRePassword] = useState(false);

    const [sendingOtp, setSendingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpToken, setOtpToken] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);

    const [, forceUpdate] = useState(0);
    useEffect(() => { forceUpdate(n => n + 1); }, []);

    const handleSendOtp = async () => {
        if (sendingOtp) return;
        if (!email.trim()) {
            setActiveField("email");
            setMessage({ kind: "error", text: "Enter your email.", field: "email" });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setActiveField("email");
            setMessage({ kind: "error", text: "Invalid email", field: "email" });
            return;
        }
        setSendingOtp(true);
        setMessage(null);
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, flow: "reset-pw" }),
            });
            const body = await res.json();
            if (!res.ok || !body?.ok) {
                setMessage({ kind: "error", text: body?.error?.message ?? "Could not send OTP. Please try again.", field: "email" });
                return;
            }
            setOtpSent(true);
            setMessage({ kind: "info", text: "OTP sent. Check your inbox." });
        } catch {
            setMessage({ kind: "error", text: "Network error. Please try again." });
        } finally {
            setSendingOtp(false);
        }
    };

    const verifyOtp = useCallback(async (code: string) => {
        setVerifyingOtp(true);
        setMessage(null);
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, otp: code }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setMessage({ kind: "error", text: body?.error?.message ?? "Invalid OTP", field: "otp" });
                return;
            }
            setOtpToken(body.data.otpToken);
            setOtpVerified(true);
        } catch {
            setMessage({ kind: "error", text: "Network error verifying OTP.", field: "otp" });
        } finally {
            setVerifyingOtp(false);
        }
    }, [email]);

    const handleOtpChange = (index: number, value: string) => {
        const v = value.replace(/\D/g, "").slice(-1);
        const updated = [...otp];
        updated[index] = v;
        setOtp(updated);
        if (otpVerified) {
            setOtpVerified(false);
            setOtpToken(null);
        }
        if (v && index < 3) {
            setTimeout(() => document.getElementById(`fp-otp-digit-${index + 1}`)?.focus(), 10);
        }
        if (updated.join("").length === 4) {
            void verifyOtp(updated.join(""));
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            setTimeout(() => document.getElementById(`fp-otp-digit-${index - 1}`)?.focus(), 10);
        }
    };

    const isLengthValid = password.length >= 8 && password.length <= 64;
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasAnyConstraint = !isLengthValid || !hasSpecialChar || !hasUpper || !hasDigit;
    const passwordValid = isLengthValid && hasSpecialChar && hasUpper && hasDigit;
    const formValid = !!email && otpVerified && passwordValid && password === rePassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        if (!email.trim()) {
            setActiveField("email");
            return setMessage({ kind: "error", text: "Enter your email.", field: "email" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setActiveField("email");
            return setMessage({ kind: "error", text: "Invalid email", field: "email" });
        }
        if (!otpVerified || !otpToken) {
            setActiveField("otp");
            return setMessage({ kind: "error", text: "Please verify your OTP first.", field: "otp" });
        }
        if (!isLengthValid || !hasSpecialChar || !hasUpper || !hasDigit) {
            setActiveField("password");
            return setMessage({ kind: "error", text: "Password does not meet requirements.", field: "password" });
        }
        if (password !== rePassword) {
            setActiveField("repassword");
            return setMessage({ kind: "error", text: "Passwords do not match.", field: "repassword" });
        }

        setSubmitting(true);
        setMessage(null);
        try {
            const resetRes = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, otpToken, password }),
            });
            const resetBody = await resetRes.json().catch(() => null);
            if (!resetRes.ok || !resetBody?.ok) {
                setMessage({ kind: "error", text: resetBody?.error?.message ?? "Could not reset password." });
                return;
            }

            window.location.href = "/login?reset=1";
        } catch {
            setMessage({ kind: "error", text: "Network error. Please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    const handleFocus = useCallback((field: ActiveField) => setActiveField(field), []);
    const handleBlur = useCallback(() => { setFocusedOtpIdx(-1); }, []);

    return {
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
    };
}
