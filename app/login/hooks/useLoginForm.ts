"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

type Stage = "credentials" | "otp";
type ActiveField = "email" | "password" | "otp";

const GAP = 2.5;

export function useLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const raw = searchParams.get("callbackUrl") ?? "/";
    // startsWith("/") alone allows protocol-relative URLs like //evil.com.
    const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
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
    const [message, setMessage] = useState<{ kind: "info" | "error"; text: string; field?: "email" | "password" | null } | null>(
        justRegistered ? { kind: "info", text: "Account created. Log in to continue." } : null,
    );

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
                    text: body?.error?.message ?? "Could not send OTP. Please try again.",
                });
            }
        } catch {
            setMessage({ kind: "error", text: "Network error sending OTP." });
        } finally {
            setSendingOtp(false);
        }
    }, [sendingOtp]);

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
                setMessage({ kind: "error", text: body?.error?.message ?? "Email or Password was incorrect" });
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
            setMessage({ kind: "error", text: "Enter the 4-digit OTP." });
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
                // Token consumed on failure — must restart from password
                setPendingMfaToken(null);
                setOtp(["", "", "", ""]);
                setStage("credentials");
                setActiveField("email");
                setMessage({ kind: "error", text: "Incorrect OTP. Please enter your password again." });
                return;
            }
            router.push(callbackUrl);
        } catch {
            setPendingMfaToken(null);
            setOtp(["", "", "", ""]);
            setStage("credentials");
            setActiveField("email");
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

    const handleFocus = useCallback((field: ActiveField) => setActiveField(field), []);
    const handleBlur = useCallback(() => {
        setActiveField(stage === "otp" ? "otp" : "email");
        setFocusedOtpIdx(-1);
    }, [stage]);

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

    return {
        email, setEmail,
        password, setPassword,
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
        isOtp,
        otpCode,
    };
}
