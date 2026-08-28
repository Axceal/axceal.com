"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { safeInternalPath } from "@/lib/http/safe-redirect";

type Stage = "credentials" | "otp";
type ActiveField = "email" | "password" | "otp";
type MessageField = ActiveField | null;

const GAP = 2.5;

export function useLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Open-redirect guard: reject absolute URLs and protocol-relative paths.
    const callbackUrl = safeInternalPath(searchParams.get("callbackUrl"));
    const justRegistered = searchParams.get("registered") === "1";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState<string[]>(["", "", "", ""]);
    const [pendingMfaToken, setPendingMfaToken] = useState<string | null>(null);

    const [stage, setStage] = useState<Stage>("credentials");
    const [activeField, setActiveField] = useState<ActiveField>("email");
    const [focusedOtpIdx, setFocusedOtpIdx] = useState(-1);

    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verified, setVerified] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const markRecentlySent = useCallback(() => {
        setResendCountdown(60);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setResendCountdown((prev) => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);
    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);
    const [message, setMessage] = useState<{ kind: "info" | "error"; text: string; field?: MessageField } | null>(
        justRegistered ? { kind: "info", text: "Account created. Log in to continue." } : null,
    );
    // Indicator visibility — only show the underline while the user actually
    // has a field focused, so it doesn't jump to a default position on mount
    // or after a submit-blur and look like a stray marker.
    const [isFocused, setIsFocused] = useState(false);

    const emailWrapRef = useRef<HTMLDivElement>(null);
    const passwordWrapRef = useRef<HTMLDivElement>(null);
    const otpWrapRef = useRef<HTMLDivElement>(null);

    const [, forceUpdate] = useState(0);
    useEffect(() => { forceUpdate(n => n + 1); }, [stage]);

    const sendOtp = useCallback(async (token: string) => {
        if (sendingOtp) return;
        setSendingOtp(true);
        try {
            const res = await fetch("/api/auth/login-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ pendingMfaToken: token }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setMessage({
                    kind: "error",
                    text: body?.error?.message ?? "Could not send Code. Please try again.",
                });
                return;
            }
            markRecentlySent();
        } catch {
            setMessage({ kind: "error", text: "Network error sending Code." });
        } finally {
            setSendingOtp(false);
        }
    }, [sendingOtp, markRecentlySent]);

    const handleVerify = async () => {
        if (submitting) return;

        if (!email.trim()) {
            setActiveField("email");
            setMessage({ kind: "error", text: "Enter your email.", field: "email" });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setActiveField("email");
            setMessage({ kind: "error", text: "Invalid email.", field: "email" });
            return;
        }
        if (!password) {
            setActiveField("password");
            setMessage({ kind: "error", text: "Enter your password.", field: "password" });
            return;
        }
        if (password.length < 8) {
            setActiveField("password");
            setMessage({ kind: "error", text: "Password must be at least 8 characters.", field: "password" });
            return;
        }

        setSubmitting(true);
        setMessage(null);
        try {
            const res = await fetch("/api/auth/verify-password", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setMessage({ kind: "error", text: body?.error?.message ?? "Incorrect email or password." });
                return;
            }
            const token: string = body.data.pendingMfaToken;
            setPendingMfaToken(token);
            setStage("otp");
            setActiveField("otp");
            await sendOtp(token);
        } catch {
            setMessage({ kind: "error", text: "Network error. Please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogin = async () => {
        if (submitting) return;
        const otpCode = otp.join("");
        if (otpCode.length !== 4) {
            setMessage({ kind: "error", text: "Enter the 4-digit Code." });
            return;
        }
        if (!pendingMfaToken) {
            setMessage({ kind: "error", text: "Session expired. Please start again." });
            setStage("credentials");
            return;
        }
        setSubmitting(true);
        setMessage(null);
        try {
            const res = await signIn("credentials-with-otp", {
                pendingMfaToken,
                otp: otpCode,
                redirect: false,
            });
            if (!res || res.error || !res.ok) {
                // Backend peeks the pendingMfaToken now — wrong OTP doesn't
                // consume it. Clear the code field, keep the token + stage so
                // the user can retry or Resend without re-entering password.
                setOtp(["", "", "", ""]);
                setActiveField("otp");
                setFocusedOtpIdx(0);
                setTimeout(() => document.getElementById("login-otp-digit-0")?.focus(), 10);
                setMessage({ kind: "error", text: "Incorrect Code.", field: "otp" });
                return;
            }
            setVerified(true);
            window.location.assign(callbackUrl);
        } catch {
            setOtp(["", "", "", ""]);
            setActiveField("otp");
            setFocusedOtpIdx(0);
            setMessage({ kind: "error", text: "Network error. Please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (stage === "credentials") await handleVerify();
        else await handleLogin();
    };

    const handleOtpChange = (index: number, value: string) => {
        const v = value.replace(/\D/g, "").slice(-1);
        const updated = [...otp];
        updated[index] = v;
        setOtp(updated);
        if (v && index < 3) {
            setTimeout(() => document.getElementById(`login-otp-digit-${index + 1}`)?.focus(), 10);
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            setTimeout(() => document.getElementById(`login-otp-digit-${index - 1}`)?.focus(), 10);
        }
    };

    const handleFocus = useCallback((field: ActiveField) => {
        setActiveField(field);
        setIsFocused(true);
    }, []);
    // Don't reset activeField on blur — that caused the indicator to jump back
    // to "email" whenever focus moved out (incl. on submit-click). Just hide
    // the indicator via isFocused; activeField is updated again on next focus.
    const handleBlur = useCallback(() => {
        setIsFocused(false);
        setFocusedOtpIdx(-1);
    }, []);

    const refMap: Record<ActiveField, React.RefObject<HTMLDivElement | null>> = {
        email: emailWrapRef,
        password: passwordWrapRef,
        otp: otpWrapRef,
    };
    const activeRef = refMap[activeField];
    const indicatorTop = activeRef.current
        ? activeRef.current.offsetTop - GAP
        : null;

    const isOtp = stage === "otp";
    const otpCode = otp.join("");

    // Strip whitespace at input — Password schema (register/reset/change)
    // already rejects whitespace, and dev environment has no legacy accounts
    // with space-containing passwords to preserve.
    const setPasswordNoSpace = useCallback((v: string) => setPassword(v.replace(/\s/g, "")), []);
    const setEmailNoSpace = useCallback((v: string) => setEmail(v.toLowerCase().replace(/\s/g, "")), []);

    return {
        email, setEmail: setEmailNoSpace,
        password, setPassword: setPasswordNoSpace,
        otp,
        pendingMfaToken,
        stage,
        activeField,
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
        isOtp: stage === "otp",
        otpCode: otp.join(""),
        resendCountdown,
        isFocused,
        verified,
    };
}
