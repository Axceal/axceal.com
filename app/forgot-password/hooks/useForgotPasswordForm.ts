"use client";
import { useState, useRef, useCallback, useEffect } from "react";

type ActiveField = "email" | "otp" | "password" | "repassword";

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
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);

    const emailWrapRef = useRef<HTMLDivElement>(null);
    const otpWrapRef = useRef<HTMLDivElement>(null);
    const passwordWrapRef = useRef<HTMLDivElement>(null);
    const repasswordWrapRef = useRef<HTMLDivElement>(null);

    const [, forceUpdate] = useState(0);
    useEffect(() => { forceUpdate(n => n + 1); }, []);

    const handleSendOtp = async () => {
        if (!email || sendingOtp) return;
        setSendingOtp(true);
        setMessage(null);
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const body = await res.json();
            if (!res.ok || !body?.ok) {
                setMessage({
                    kind: "error",
                    text: body?.error?.message ?? "Could not send OTP. Please try again.",
                });
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

    const handleOtpChange = (index: number, value: string) => {
        const v = value.replace(/\D/g, "").slice(-1);
        const updated = [...otp];
        updated[index] = v;
        setOtp(updated);
        if (v && index < 3) {
            setTimeout(() => document.getElementById(`fp-otp-digit-${index + 1}`)?.focus(), 10);
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            setTimeout(() => document.getElementById(`fp-otp-digit-${index - 1}`)?.focus(), 10);
        }
    };

    const otpCode = otp.join("");
    const isLengthValid = password.length >= 8 && password.length <= 64;
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasAnyConstraint = !isLengthValid || !hasSpecialChar || !hasUpper || !hasDigit;
    const otpComplete = otpCode.length === 4;
    const passwordValid = isLengthValid && hasSpecialChar && hasUpper && hasDigit;
    const formValid =
        !!email &&
        otpCode.length === 4 &&
        password.length >= 8 &&
        password === rePassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        if (!email) return setMessage({ kind: "error", text: "Enter your email." });
        if (otpCode.length !== 4) return setMessage({ kind: "error", text: "Enter the 4-digit OTP." });
        if (password.length < 8) return setMessage({ kind: "error", text: "Password must be at least 8 characters." });
        if (password !== rePassword) return setMessage({ kind: "error", text: "Passwords do not match." });

        setSubmitting(true);
        setMessage(null);
        try {
            // Step 1: exchange raw OTP for a single-use token
            const verifyRes = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, otp: otpCode }),
            });
            const verifyBody = await verifyRes.json().catch(() => null);
            if (!verifyRes.ok || !verifyBody?.ok) {
                setMessage({ kind: "error", text: verifyBody?.error?.message ?? "Incorrect OTP." });
                return;
            }
            const { otpToken } = verifyBody.data as { otpToken: string };

            // Step 2: reset password with the token
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

            // Redirect to login with success banner
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
        submitting,
        message,
        emailWrapRef,
        otpWrapRef,
        passwordWrapRef,
        repasswordWrapRef,
        handleSendOtp,
        handleOtpChange,
        handleOtpKeyDown,
        handleSubmit,
        handleFocus,
        handleBlur,
        otpCode,
        formValid,
        isLengthValid,
        hasSpecialChar,
        hasUpper,
        hasDigit,
        hasAnyConstraint,
        otpComplete,
        passwordValid,
    };
}
