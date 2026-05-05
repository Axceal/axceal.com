"use client";
import { createContext, useContext, useState, useRef, useEffect } from "react";
import { COUNTRIES } from "./constants";

type Country = typeof COUNTRIES[number];

interface AccountDetailsState {
    firstName: string;
    setFirstName: (v: string) => void;
    lastName: string;
    setLastName: (v: string) => void;

    selDay: number | null;
    setSelDay: (v: number | null) => void;
    selMonth: number;
    setSelMonth: (v: number) => void;
    yearPrefix: "19" | "20";
    setYearPrefix: (v: "19" | "20") => void;
    yearSuffix: string;
    setYearSuffix: (v: string) => void;

    gender: string | null;
    setGender: (v: string | null) => void;

    country: Country;
    setCountry: (v: Country) => void;
    countrySearch: string;
    setCountrySearch: (v: string) => void;
    showSearch: boolean;
    setShowSearch: React.Dispatch<React.SetStateAction<boolean>>;
    phone: string[];
    setPhone: (v: string[]) => void;
    phoneSign: "+" | "-";
    setPhoneSign: (v: "+" | "-") => void;
    phoneRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    phoneOtpSent: boolean;
    setPhoneOtpSent: (v: boolean) => void;
    // 6-digit Firebase OTP (separate from phone digit entry)
    phoneOtp: string[];
    setPhoneOtp: (v: string[]) => void;
    // Callback refs set by the phone page; called by the layout on Send/Proceed
    onSendPhoneOtp: { current: (() => Promise<boolean>) | null };
    onVerifyPhoneOtp: { current: (() => Promise<boolean>) | null };

    hydrated: boolean;
}

const AccountDetailsContext = createContext<AccountDetailsState | null>(null);

const GENDER_SERVER_TO_UI: Record<string, string> = {
    female: "Female",
    male: "Male",
    private: "Keep it Private",
};

export function AccountDetailsProvider({ children }: { children: React.ReactNode }) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [selDay, setSelDay] = useState<number | null>(null);
    const [selMonth, setSelMonth] = useState(new Date().getMonth());
    const [yearPrefix, setYearPrefix] = useState<"19" | "20">("20");
    const [yearSuffix, setYearSuffix] = useState("");
    const [gender, setGender] = useState<string | null>(null);
    const [country, setCountryState] = useState(COUNTRIES[0]);
    const [countrySearch, setCountrySearch] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [phone, setPhone] = useState<string[]>(Array(COUNTRIES[0].digits).fill(""));
    const [phoneSign, setPhoneSign] = useState<"+" | "-">("+");
    const [phoneOtpSent, setPhoneOtpSent] = useState(false);
    const [phoneOtp, setPhoneOtp] = useState<string[]>(Array(6).fill(""));
    const onSendPhoneOtp = useRef<(() => Promise<boolean>) | null>(null);
    const onVerifyPhoneOtp = useRef<(() => Promise<boolean>) | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const phoneRefs = useRef<(HTMLInputElement | null)[]>(Array(COUNTRIES[0].digits).fill(null));

    const setCountry = (c: Country) => {
        setCountryState(c);
        setPhone(Array(c.digits).fill(""));
        phoneRefs.current = Array(c.digits).fill(null);
    };

    useEffect(() => {
        const ac = new AbortController();
        fetch("/api/account/profile", { signal: ac.signal, cache: "no-store" })
            .then(async (r) => (r.ok ? r.json() : null))
            .then((body: { ok?: boolean; data?: Record<string, unknown> } | null) => {
                if (!body?.ok || !body.data) return;
                const p = body.data as {
                    firstName: string | null;
                    lastName: string | null;
                    birthday: string | null;
                    gender: string | null;
                    phoneCountryCode: string | null;
                    phone: string | null;
                    phoneSign: "+" | "-";
                };
                if (p.firstName) setFirstName(p.firstName);
                if (p.lastName) setLastName(p.lastName);
                if (p.birthday) {
                    const [yyyy, mm, dd] = p.birthday.split("-");
                    setSelDay(parseInt(dd, 10));
                    setSelMonth(parseInt(mm, 10) - 1);
                    const prefix = yyyy.slice(0, 2);
                    if (prefix === "19" || prefix === "20") setYearPrefix(prefix);
                    setYearSuffix(yyyy.slice(2));
                }
                if (p.gender && GENDER_SERVER_TO_UI[p.gender]) {
                    setGender(GENDER_SERVER_TO_UI[p.gender]);
                }
                if (p.phoneCountryCode) {
                    const c = COUNTRIES.find(
                        x => x.code.replace(/\D/g, "") === p.phoneCountryCode,
                    );
                    if (c) {
                        setCountryState(c);
                        const digits = (p.phone ?? "").split("").slice(0, c.digits);
                        while (digits.length < c.digits) digits.push("");
                        setPhone(digits);
                        phoneRefs.current = Array(c.digits).fill(null);
                    }
                }
                if (p.phoneSign === "+" || p.phoneSign === "-") setPhoneSign(p.phoneSign);
            })
            .catch(() => { /* ignore */ })
            .finally(() => setHydrated(true));
        return () => ac.abort();
    }, []);

    return (
        <AccountDetailsContext.Provider value={{
            firstName, setFirstName,
            lastName, setLastName,
            selDay, setSelDay,
            selMonth, setSelMonth,
            yearPrefix, setYearPrefix,
            yearSuffix, setYearSuffix,
            gender, setGender,
            country, setCountry,
            countrySearch, setCountrySearch,
            showSearch, setShowSearch,
            phone, setPhone,
            phoneSign, setPhoneSign,
            phoneRefs,
            phoneOtpSent, setPhoneOtpSent,
            phoneOtp, setPhoneOtp,
            onSendPhoneOtp,
            onVerifyPhoneOtp,
            hydrated,
        }}>
            {children}
        </AccountDetailsContext.Provider>
    );
}

export function useAccountDetails() {
    const ctx = useContext(AccountDetailsContext);
    if (!ctx) throw new Error("useAccountDetails must be used within AccountDetailsProvider");
    return ctx;
}
