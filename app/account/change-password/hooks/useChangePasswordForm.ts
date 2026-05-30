"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { apiFetch } from "@/lib/http/client";

type ActiveField = "current" | "otp" | "password" | "repassword";
type Message = { kind: "info" | "error"; text: string; field?: ActiveField | null };

const GAP = 2.5;

export function useChangePasswordForm() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);
    const [verifyingCurrentPassword, setVerifyingCurrentPassword] = useState(false);
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [focusedOtpIdx, setFocusedOtpIdx] = useState(-1);
    const [password, setPassword] = useState("");
    const [rePassword, setRePassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showRePassword, setShowRePassword] = useState(false);
    const [activeField, setActiveField] = useState<ActiveField>("current");
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpToken, setOtpToken] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);
    const [recentlySent, setRecentlySent] = useState(false);
    const recentlySentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const focusField = useCallback((f: ActiveField) => {
        setActiveField(f);
        setIsFocused(true);
    }, []);
    const blurField = useCallback(() => {
        setIsFocused(false);
        setFocusedOtpIdx(-1);
    }, []);

    const markRecentlySent = useCallback(() => {
        setRecentlySent(true);
        if (recentlySentTimer.current) clearTimeout(recentlySentTimer.current);
        recentlySentTimer.current = setTimeout(() => setRecentlySent(false), 20000);
    }, []);
    useEffect(() => () => {
        if (recentlySentTimer.current) clearTimeout(recentlySentTimer.current);
    }, []);

    // Reset verification + OTP state when current password is edited after verify.
    const prevCurrentPassword = useRef(currentPassword);
    useEffect(() => {
        if (prevCurrentPassword.current !== currentPassword && currentPasswordVerified) {
            setCurrentPasswordVerified(false);
            setOtp(["", "", "", ""]);
            setOtpVerified(false);
            setOtpToken(null);
            setRecentlySent(false);
            setPassword("");
            setRePassword("");
        }
        prevCurrentPassword.current = currentPassword;
    });

    const currentPasswordWrapRef = useRef<HTMLDivElement>(null);
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
                setMessage({ kind: "error", text: body?.error?.message ?? "Could not send Code.", field: "otp" });
                return;
            }
            markRecentlySent();
        } catch {
            setMessage({ kind: "error", text: "Network error.", field: "otp" });
        } finally {
            setSendingOtp(false);
        }
    }, [sendingOtp, markRecentlySent]);

    const verifyCurrentPassword = useCallback(async () => {
        if (verifyingCurrentPassword) return;
        if (!currentPassword) {
            setMessage({ kind: "error", text: "Enter your current password.", field: "current" });
            return;
        }
        setVerifyingCurrentPassword(true);
        setMessage(null);
        try {
            const res = await apiFetch("/api/account/verify-current-password", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ currentPassword }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setMessage({ kind: "error", text: body?.error?.message ?? "Incorrect password.", field: "current" });
                return;
            }
            setCurrentPasswordVerified(true);
            void sendOtp();
        } catch {
            setMessage({ kind: "error", text: "Network error.", field: "current" });
        } finally {
            setVerifyingCurrentPassword(false);
        }
    }, [verifyingCurrentPassword, currentPassword, sendOtp]);

    const verifyOtp = useCallback(async (code: string) => {
        setVerifyingOtp(true);
        setMessage(null);
        try {
            const res = await apiFetch("/api/account/verify-otp", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ otp: code }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setMessage({ kind: "error", text: body?.error?.message ?? "Invalid Code.", field: "otp" });
                return;
            }
            setOtpToken(body.data.otpToken);
            setOtpVerified(true);
        } catch {
            setMessage({ kind: "error", text: "Network error verifying Code.", field: "otp" });
        } finally {
            setVerifyingOtp(false);
        }
    }, []);

    const isLengthValid = password.length >= 8 && password.length <= 64;
    const hasSpecialChar = /[^\sa-zA-Z0-9]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const passwordValid = isLengthValid && hasSpecialChar && hasUpper && hasDigit;
    const hasAnyConstraint = !isLengthValid || !hasSpecialChar || !hasUpper || !hasDigit;

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
            setTimeout(() => document.getElementById(`change-pw-otp-digit-${index + 1}`)?.focus(), 10);
        }
        // Verification now driven by the bottom action button rather than
        // firing on the 4th digit — lets the user fix typos before submitting.
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            setTimeout(() => document.getElementById(`change-pw-otp-digit-${index - 1}`)?.focus(), 10);
        }
    };

    const handleSave = async () => {
        if (submitting || verifyingOtp) return;
        // Stage 2 (currentPassword verified, OTP not yet verified) — bottom
        // button acts as the verify-code action. Stage 3 (OTP verified)
        // continues to the actual save flow below.
        if (!otpVerified || !otpToken) {
            const code = otp.join("");
            if (code.length !== 4) {
                setActiveField("otp");
                setMessage({ kind: "error", text: "Enter the 4-digit Code.", field: "otp" });
                return;
            }
            await verifyOtp(code);
            return;
        }
        if (!password) {
            setActiveField("password");
            setMessage({ kind: "error", text: "Enter new password.", field: "password" });
            return;
        }
        if (!isLengthValid || !hasSpecialChar || !hasUpper || !hasDigit) {
            setActiveField("password");
            setMessage({ kind: "error", text: "Password does not meet requirements.", field: "password" });
            return;
        }
        if (password !== rePassword) {
            setActiveField("repassword");
            setMessage({ kind: "error", text: "Passwords do not match.", field: "repassword" });
            return;
        }
        if (!currentPassword) {
            setActiveField("current");
            setMessage({ kind: "error", text: "Enter current password.", field: "current" });
            return;
        }
        setSubmitting(true);
        setMessage(null);
        try {
            const res = await apiFetch("/api/account/change-password", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ currentPassword, otpToken, password }),
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
        current: currentPasswordWrapRef,
        otp: otpWrapRef,
        password: passwordWrapRef,
        repassword: repasswordWrapRef,
    };
    const activeRef = refMap[activeField];
    const indicatorTop = activeRef.current ? activeRef.current.offsetTop - GAP : null;

    const setCurrentPasswordNoSpace = useCallback((v: string) => setCurrentPassword(v.replace(/\s/g, "")), []);
    const setPasswordNoSpace = useCallback((v: string) => setPassword(v.replace(/\s/g, "")), []);
    const setRePasswordNoSpace = useCallback((v: string) => setRePassword(v.replace(/\s/g, "")), []);

    return {
        currentPassword, setCurrentPassword: setCurrentPasswordNoSpace,
        showCurrentPassword, setShowCurrentPassword,
        currentPasswordVerified,
        verifyingCurrentPassword,
        verifyCurrentPassword,
        otp,
        focusedOtpIdx, setFocusedOtpIdx,
        password, setPassword: setPasswordNoSpace,
        rePassword, setRePassword: setRePasswordNoSpace,
        showPassword, setShowPassword,
        showRePassword, setShowRePassword,
        activeField, setActiveField,
        sendingOtp,
        verifyingOtp,
        submitting,
        message,
        currentPasswordWrapRef,
        otpWrapRef,
        passwordWrapRef,
        repasswordWrapRef,
        otpVerified,
        passwordValid,
        isLengthValid,
        hasSpecialChar,
        hasUpper,
        hasDigit,
        hasAnyConstraint,
        sendOtp,
        handleOtpChange,
        handleOtpKeyDown,
        handleSave,
        indicatorTop,
        recentlySent,
        isFocused,
        focusField,
        blurField,
    };
}
