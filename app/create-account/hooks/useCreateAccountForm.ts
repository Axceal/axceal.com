"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
    apiOtpLogin,
    apiRegister,
    apiSendRegisterOtp,
    apiVerifyOtp,
    checkPasswordComplexity,
    EMAIL_RE,
} from "./createAccountApi";
import { sessionKeys, writeSession } from "@/lib/sessionKeys";
import { safeInternalPath } from "@/lib/http/safe-redirect";

type ActiveField = "email" | "otp" | "password" | "repassword";
type MessageField = ActiveField | null;
type Message = { kind: "info" | "error"; text: string; field?: MessageField };

export function useCreateAccountForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Open-redirect guard: reject absolute URLs and protocol-relative paths.
    const from = safeInternalPath(searchParams.get("from"));
    // W6 — popup-1 routes here with `?intent=waitlist`; flag is forwarded to
    // the register endpoint so the server-side waitlist join runs in the same
    // request, and persisted into pendingSignup so /account-ready can route
    // the user back home with `?joined=1` instead of the safety-details flow.
    const intent = searchParams.get("intent") === "waitlist" ? "waitlist" : undefined;

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
    const [emailExists, setEmailExists] = useState(false);
    const [emailExistsFor, setEmailExistsFor] = useState<string>("");
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpToken, setOtpToken] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [otpLoginInProgress, setOtpLoginInProgress] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [message, setMessage] = useState<Message | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    const emailWrapRef = useRef<HTMLDivElement>(null);
    const otpWrapRef = useRef<HTMLDivElement>(null);
    const passwordWrapRef = useRef<HTMLDivElement>(null);
    const repasswordWrapRef = useRef<HTMLDivElement>(null);

    // Force re-render after mount so refs have real offsetTop values
    const [, forceUpdate] = useState(0);
    useEffect(() => { forceUpdate(n => n + 1); }, []);

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

    // Clear emailExists when the user edits the email — the alt UI references a
    // specific address and shouldn't persist across edits.
    const setEmailReset = useCallback((next: string) => {
        setEmail(next.replace(/\s/g, ""));
        setEmailExists(false);
    }, []);

    const handleSendOtp = useCallback(async () => {
        if (sendingOtp) return;
        if (!email.trim()) {
            setActiveField("email");
            setMessage({ kind: "error", text: "Enter your email.", field: "email" });
            return;
        }
        if (!EMAIL_RE.test(email.trim())) {
            setActiveField("email");
            setMessage({ kind: "error", text: "Invalid email.", field: "email" });
            return;
        }
        setSendingOtp(true);
        setMessage(null);
        setEmailExists(false);
        try {
            const result = await apiSendRegisterOtp(email);
            if (!result.ok) { setMessage({ kind: "error", text: result.message }); return; }
            setOtpSent(true);
            markRecentlySent();
        } finally {
            setSendingOtp(false);
        }
    }, [sendingOtp, email, markRecentlySent]);

    const verifyOtp = useCallback(async (code: string) => {
        setVerifyingOtp(true);
        setMessage(null);
        try {
            const result = await apiVerifyOtp(email, code);
            if (!result.ok) { setMessage({ kind: "error", text: result.message, field: "otp" }); return; }
            setOtpToken(result.data.otpToken);
            setOtpVerified(true);
            // Caller has now proven inbox control. Backend reports whether the
            // email is already registered — flip to the Login / Forgot Password
            // UI so the user doesn't waste time entering a password they can't
            // actually use to register.
            if (result.data.accountExists) {
                setEmailExists(true);
                setEmailExistsFor(email);
            }
        } finally {
            setVerifyingOtp(false);
        }
    }, [email]);

    const handleOtpLogin = useCallback(async () => {
        if (otpLoginInProgress) return;
        if (!otpToken) {
            setMessage({ kind: "error", text: "Code verification expired. Please request a new one." });
            return;
        }
        setOtpLoginInProgress(true);
        setMessage(null);
        try {
            const result = await apiOtpLogin(emailExistsFor || email, otpToken);
            if (!result.ok) {
                // Token is single-use — once burned the user must restart from
                // email step. Clear local state so the UI matches server state.
                setOtpToken(null);
                setOtpVerified(false);
                setEmailExists(false);
                setMessage({ kind: "error", text: result.message });
                return;
            }
            const signInResult = await signIn("credentials-otp-login", {
                loginToken: result.data.pendingMfaToken,
                redirect: false,
            });
            if (!signInResult || signInResult.error) {
                setMessage({ kind: "error", text: "Sign-in failed. Please request a new Code." });
                return;
            }
            router.push(from);
        } finally {
            setOtpLoginInProgress(false);
        }
    }, [otpLoginInProgress, otpToken, emailExistsFor, email, router, from]);

    const handleForgotPassword = useCallback(() => {
        if (!otpToken) {
            setMessage({ kind: "error", text: "Code verification expired. Please request a new one." });
            return;
        }
        // Hand off via sessionStorage so the otpToken doesn't leak via Referer
        // or browser history. writeSession swallows quota / private-mode
        // errors — forgot-password page falls back to re-collecting the OTP.
        writeSession(sessionKeys.forgotPwPrefilled, {
            email: emailExistsFor || email,
            otpToken,
        });
        router.push("/forgot-password?prefilled=1");
    }, [otpToken, emailExistsFor, email, router]);

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
        // Verification now driven by the bottom Submit button rather than
        // firing on the 4th digit — gives the user a chance to correct typos
        // and matches the gated flow on /login.
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            setTimeout(() => document.getElementById(`otp-digit-${index - 1}`)?.focus(), 10);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting || verifyingOtp) return;

        if (!email.trim()) {
            setActiveField("email");
            return setMessage({ kind: "error", text: "Enter your email.", field: "email" });
        }
        if (!EMAIL_RE.test(email.trim())) {
            setActiveField("email");
            return setMessage({ kind: "error", text: "Invalid email.", field: "email" });
        }
        // Stage 1 (post-Send, pre-Verify): submit acts as the verify button.
        if (otpSent && !otpVerified) {
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
            const result = await apiRegister(email, password, otpToken, intent);
            if (!result.ok) { setMessage({ kind: "error", text: result.message }); return; }
            writeSession(sessionKeys.pendingSignup, {
                signupSessionToken: result.data.signupSessionToken,
                from: from ?? "",
                // W6 — intent carried forward so /account-ready knows to skip
                // the safety-details prompt and bounce home with ?joined=1.
                intent,
                // F15.7 — issuedAt lets /account-ready bail with a clear
                // "session expired" message instead of a generic signin
                // failure once the server-side 5-min TTL elapses.
                issuedAt: Date.now(),
            });
            router.push("/account-ready");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFocus = useCallback((field: ActiveField) => {
        setActiveField(field);
        setIsFocused(true);
    }, []);
    const handleBlur = useCallback(() => {
        setIsFocused(false);
        setFocusedOtpIdx(-1);
    }, []);

    const complexity = checkPasswordComplexity(password);

    // Strip whitespace at the input layer — backend Password schema rejects
    // whitespace too, but stripping on entry stops the user ever seeing a
    // space land in the field (defense-in-depth against accidental spacebar).
    const setPasswordNoSpace = useCallback((v: string) => setPassword(v.replace(/\s/g, "")), []);
    const setRePasswordNoSpace = useCallback((v: string) => setRePassword(v.replace(/\s/g, "")), []);

    return {
        email, setEmail: setEmailReset,
        emailExists, emailExistsFor,
        otp,
        password, setPassword: setPasswordNoSpace,
        rePassword, setRePassword: setRePasswordNoSpace,
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
        handleOtpLogin,
        handleForgotPassword,
        otpLoginInProgress,
        resendCountdown,
        handleFocus,
        handleBlur,
        isFocused,
        otpVerified,
        verifyingOtp,
        ...complexity,
    };
}
