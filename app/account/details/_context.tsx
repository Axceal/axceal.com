"use client";
import { createContext, useContext, useState, useRef } from "react";
import { COUNTRIES } from "./_constants";

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
    phoneRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
}

const AccountDetailsContext = createContext<AccountDetailsState | null>(null);

export function AccountDetailsProvider({ children }: { children: React.ReactNode }) {
    const [firstName,     setFirstName]     = useState("");
    const [lastName,      setLastName]      = useState("");
    const [selDay,        setSelDay]        = useState<number | null>(null);
    const [selMonth,      setSelMonth]      = useState(new Date().getMonth());
    const [yearPrefix,    setYearPrefix]    = useState<"19" | "20">("20");
    const [yearSuffix,    setYearSuffix]    = useState("");
    const [gender,        setGender]        = useState<string | null>(null);
    const [country,       setCountryState]  = useState(COUNTRIES[0]);
    const [countrySearch, setCountrySearch] = useState("");
    const [showSearch,    setShowSearch]    = useState(false);
    const [phone,         setPhone]         = useState<string[]>(Array(COUNTRIES[0].digits).fill(""));
    const phoneRefs = useRef<(HTMLInputElement | null)[]>(Array(COUNTRIES[0].digits).fill(null));

    const setCountry = (c: Country) => {
        setCountryState(c);
        setPhone(Array(c.digits).fill(""));
        phoneRefs.current = Array(c.digits).fill(null);
    };

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
            phoneRefs,
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
