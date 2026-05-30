"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { sessionKeys, readSession, clearSession } from "@/lib/sessionKeys";

type ActiveField = "email" | "otp" | "password" | "repassword";
type Message = { kind: "info" | "error"; text: string; field?: ActiveField | null };

export function useForgotPasswordForm() {
    const searchParams = useSearchParams();
    const prefilled = searchParams.get("prefilled") === "1";

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
    const [recentlySent, setRecentlySent] = useState(false);
    const recentlySentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const markRecentlySent = useCallback(() => {
        setRecentlySent(true);
        if (recentlySentTimer.current) clearTimeout(recentlySentTimer.current);
        recentlySentTimer.current = setTimeout(() => setRecentlySent(false), 20000);
    }, []);
    useEffect(() => () => {
        if (recentlySentTimer.current) clearTimeout(recentlySentTimer.current);
    }, []);

    const [, forceUpdate] = useState(0);
    useEffect(() => { forceUpdate(n => n + 1); }, []);

    // Handoff from create-account: when the user clicked "Forgot Password"
    // after verifying OTP for an existing account, the create-account form
    // stashes {email, otpToken} in sessionStorage and navigates here with
    // ?prefilled=1. We hydrate, skip the email + OTP steps entirely, and
    // jump straight to the new-password step. sessionStorage entry is read
    // once and cleared so the token isn't replayable across reloads.
    useEffect(() => {
        if (!prefilled) return;
        const parsed = readSession<{ email: string; otpToken: string }>(
            sessionKeys.forgotPwPrefilled,
            (v): v is { email: string; otpToken: string } =>
                !!v
                && typeof v === "object"
                && typeof (v as { email?: unknown }).email === "string"
                && typeof (v as { otpToken?: unknown }).otpToken === "string",
        );
        clearSession(sessionKeys.forgotPwPrefilled);
        if (!parsed) return;
        setEmail(parsed.email);
        setOtpToken(parsed.otpToken);
        setOtpVerified(true);
        setOtpSent(true);
        setActiveField("password");
    }, [prefilled]);

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
                setMessage({ kind: "error", text: body?.error?.message ?? "Could not send Code. Please try again.", field: "email" });
                return;
            }
            setOtpSent(true);
            markRecentlySent();
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
                setMessage({ kind: "error", text: body?.error?.message ?? "Invalid Code", field: "otp" });
                return;
            }
            setOtpToken(body.data.otpToken);
            setOtpVerified(true);
        } catch {
            setMessage({ kind: "error", text: "Network error verifying Code.", field: "otp" });
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
        // Verification now driven by the bottom Proceed button rather than
        // firing on the 4th digit — gives the user a chance to correct typos
        // and matches the gated flow on /login.
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            setTimeout(() => document.getElementById(`fp-otp-digit-${index - 1}`)?.focus(), 10);
        }
    };

    const isLengthValid = password.length >= 8 && password.length <= 64;
    const hasSpecialChar = /[^\sa-zA-Z0-9]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasAnyConstraint = !isLengthValid || !hasSpecialChar || !hasUpper || !hasDigit;
    const passwordValid = isLengthValid && hasSpecialChar && hasUpper && hasDigit;
    const formValid = !!email && otpVerified && passwordValid && password === rePassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting || verifyingOtp) return;

        if (!email.trim()) {
            setActiveField("email");
            return setMessage({ kind: "error", text: "Enter your email.", field: "email" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setActiveField("email");
            return setMessage({ kind: "error", text: "Invalid email", field: "email" });
        }
        // Stage 1 (post-Send, pre-Verify): submit acts as the verify button.
        // Prefilled mode skips OTP entirely (token already issued upstream).
        if (!prefilled && otpSent && !otpVerified) {
            const code = otp.join("");
            if (code.length !== 4) {
                setActiveField("otp");
                return setMessage({ kind: "error", text: "Enter the 4-digit Code.", field: "otp" });
            }
            await verifyOtp(code);
            return;
        }
        if (!otpVerified || !otpToken) {
            setActiveField("otp");
            return setMessage({ kind: "error", text: "Please verify your Code first.", field: "otp" });
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

    // Indicator visibility — don't reset activeField on blur (causes jumps),
    // just track focus separately.
    const [isFocused, setIsFocused] = useState(false);
    const handleFocus = useCallback((field: ActiveField) => {
        setActiveField(field);
        setIsFocused(true);
    }, []);
    const handleBlur = useCallback(() => {
        setIsFocused(false);
        setFocusedOtpIdx(-1);
    }, []);

    // Strip whitespace at the input layer; backend Password / Email schemas
    // also reject whitespace.
    const setEmailNoSpace = useCallback((v: string) => setEmail(v.replace(/\s/g, "")), []);
    const setPasswordNoSpace = useCallback((v: string) => setPassword(v.replace(/\s/g, "")), []);
    const setRePasswordNoSpace = useCallback((v: string) => setRePassword(v.replace(/\s/g, "")), []);

    return {
        email, setEmail: setEmailNoSpace,
        otp,
        password, setPassword: setPasswordNoSpace,
        rePassword, setRePassword: setRePasswordNoSpace,
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
    };
}
