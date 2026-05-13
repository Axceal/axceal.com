"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ActiveField = "email" | "otp" | "password" | "repassword";

export function useCreateAccountForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get("from");

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");

    // Default: indicator points at Email (first field)
    const [activeField, setActiveField] = useState<ActiveField>("email");
    // Which OTP digit is currently focused (-1 = none)
    const [focusedOtpIdx, setFocusedOtpIdx] = useState(-1);

    const [showPassword, setShowPassword] = useState(false);
    const [showRePassword, setShowRePassword] = useState(false);

    const [sendingOtp, setSendingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpToken, setOtpToken] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ kind: "info" | "error"; text: string; field?: "email" | "otp" | "password" | "repassword" | null } | null>(null);

    // Wrapper refs for each field group (indicator anchors to these)
    const emailWrapRef = useRef<HTMLDivElement>(null);
    const otpWrapRef = useRef<HTMLDivElement>(null);
    const passwordWrapRef = useRef<HTMLDivElement>(null);
    const repasswordWrapRef = useRef<HTMLDivElement>(null);

    // Force re-render after mount so refs have real offsetTop values
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
            setMessage({ kind: "error", text: "Invalid email.", field: "email" });
            return;
        }
        setSendingOtp(true);
        setMessage(null);
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, flow: "register" }),
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

    const verifyOtp = useCallback(async (code: string) => {
        setVerifyingOtp(true);
        setMessage(null);
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, otp: code }),
            });
            const body = await res.json();
            if (!res.ok || !body?.ok) {
                setMessage({ kind: "error", text: body?.error?.message ?? "Invalid OTP.", field: "otp" });
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
            setTimeout(() => document.getElementById(`otp-digit-${index + 1}`)?.focus(), 10);
        }
        if (updated.join("").length === 4) {
            void verifyOtp(updated.join(""));
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            setTimeout(() => document.getElementById(`otp-digit-${index - 1}`)?.focus(), 10);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        if (!email.trim()) {
            setActiveField("email");
            return setMessage({ kind: "error", text: "Enter your email.", field: "email" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setActiveField("email");
            return setMessage({ kind: "error", text: "Invalid email.", field: "email" });
        }
        if (!otpVerified || !otpToken) {
            setActiveField("otp");
            return setMessage({ kind: "error", text: "Please verify your OTP first.", field: "otp" });
        }
        if (password.length < 8) {
            setActiveField("password");
            return setMessage({ kind: "error", text: "Password must be at least 8 characters.", field: "password" });
        }
        if (password !== rePassword) {
            setActiveField("repassword");
            return setMessage({ kind: "error", text: "Passwords do not match.", field: "repassword" });
        }

        setSubmitting(true);
        setMessage(null);
        try {
            const registerRes = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email, password, otpToken }),
            });
            const registerBody = await registerRes.json();
            if (!registerRes.ok || !registerBody?.ok) {
                setMessage({
                    kind: "error",
                    text: registerBody?.error?.message ?? "Could not create account.",
                });
                return;
            }

            const signupSessionToken: string = registerBody.data.signupSessionToken;
            sessionStorage.setItem("pendingSignup", JSON.stringify({ signupSessionToken, from: from ?? "" }));
            router.push("/account-ready");
        } catch {
            setMessage({ kind: "error", text: "Network error. Please try again." });
        } finally {
            setSubmitting(false);
        }
    };

    const handleFocus = useCallback((field: ActiveField) => setActiveField(field), []);
    // On blur return to Email (first field)
    const handleBlur = useCallback(() => {
        setActiveField("email");
        setFocusedOtpIdx(-1);
    }, []);

    const isLengthValid = password.length >= 8 && password.length <= 64;
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasAnyConstraint = !isLengthValid || !hasSpecialChar || !hasUpper || !hasDigit;
    const passwordValid = isLengthValid && hasSpecialChar && hasUpper && hasDigit;

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
        otpVerified,
        verifyingOtp,
        isLengthValid,
        hasSpecialChar,
        hasUpper,
        hasDigit,
        hasAnyConstraint,
        passwordValid,
    };
}
