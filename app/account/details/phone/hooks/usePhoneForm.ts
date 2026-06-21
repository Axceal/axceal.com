"use client";
import { useState, useEffect, useCallback } from "react";
import { useAccountDetails } from "../../context";
import { COUNTRIES } from "../../constants";
import { apiFetch } from "@/lib/http/client";

export function usePhoneForm() {
    const {
        firstName,
        country, setCountry,
        countrySearch, setCountrySearch,
        showSearch, setShowSearch,
        phone, setPhone,
        phoneSign: sign, setPhoneSign: setSign,
        phoneOtp, setPhoneOtp,
        phoneOtpSent,
        onSendPhoneOtp: onSendPhoneOtpRef,
        onVerifyPhoneOtp: onVerifyPhoneOtpRef,
    } = useAccountDetails();

    const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
    const [focusedOtpIdx, setFocusedOtpIdx] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const e164Phone = `+${country.code.replace(/\D/g, "")}${phone.join("")}`;

    const handlePhoneChange = (i: number, val: string) => {
        const v = val.replace(/\D/g, "").slice(-1);
        const updated = [...phone];
        updated[i] = v;
        setPhone(updated);
        if (v && i < phone.length - 1) setTimeout(() => document.getElementById(`phone-digit-${i + 1}`)?.focus(), 10);
    };

    const handlePhoneKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !phone[i] && i > 0) {
            setTimeout(() => document.getElementById(`phone-digit-${i - 1}`)?.focus(), 10);
        }
    };

    const handleOtpChange = (i: number, val: string) => {
        const v = val.replace(/\D/g, "").slice(-1);
        const updated = [...phoneOtp];
        updated[i] = v;
        setPhoneOtp(updated);
        if (v && i < phoneOtp.length - 1) setTimeout(() => document.getElementById(`phone-otp-digit-${i + 1}`)?.focus(), 10);
    };

    const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !phoneOtp[i] && i > 0) {
            setTimeout(() => document.getElementById(`phone-otp-digit-${i - 1}`)?.focus(), 10);
        }
    };

    const sendPhoneOtp = useCallback(async (): Promise<boolean> => {
        setErrorMsg(null);
        try {
            const res = await apiFetch("/api/account/phone/send", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ phone: e164Phone }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setErrorMsg(body?.error?.message ?? "Could not send Code.");
                return false;
            }
            return true;
        } catch {
            setErrorMsg("Network error. Please try again.");
            return false;
        }
    }, [e164Phone]);

    const verifyPhoneOtp = useCallback(async (): Promise<boolean> => {
        setErrorMsg(null);
        const code = phoneOtp.join("");
        if (code.length !== 6) {
            setErrorMsg("Enter the 6-digit Code.");
            return false;
        }
        try {
            const res = await apiFetch("/api/account/phone/verify", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ phone: e164Phone, code }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setErrorMsg(body?.error?.message ?? "Verification failed.");
                return false;
            }
            return true;
        } catch {
            setErrorMsg("Network error. Please try again.");
            return false;
        }
    }, [phoneOtp, e164Phone]);

    useEffect(() => {
        onSendPhoneOtpRef.current = sendPhoneOtp;
        onVerifyPhoneOtpRef.current = verifyPhoneOtp;
    }, [sendPhoneOtp, verifyPhoneOtp, onSendPhoneOtpRef, onVerifyPhoneOtpRef]);

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().startsWith(countrySearch.toLowerCase()) ||
        c.code.includes(countrySearch)
    );

    const codeNumbers = country.code.replace(/\D/g, "").split("");

    return {
        firstName,
        country, setCountry,
        countrySearch, setCountrySearch,
        showSearch, setShowSearch,
        phone,
        sign, setSign,
        phoneOtp,
        phoneOtpSent,
        focusedIdx, setFocusedIdx,
        focusedOtpIdx, setFocusedOtpIdx,
        errorMsg,
        filteredCountries,
        codeNumbers,
        handlePhoneChange,
        handlePhoneKeyDown,
        handleOtpChange,
        handleOtpKeyDown,
        sendPhoneOtp,
    };
}
