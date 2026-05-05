"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/http/client";
import countriesData from "../../../data/countries.json";
import statesData from "../../../data/states.json";

const COUNTRIES = countriesData as { name: string; code: string; dialCode: string }[];
const STATES = statesData as Record<string, string[]>;

export function indicatorPos(el: HTMLDivElement | null): { top: number; left: number } | null {
    if (!el) return null;
    return {
        top: el.offsetTop - 2.5,
        left: el.offsetLeft + el.offsetWidth / 2 - 20,
    };
}

export interface AddressFormState {
    first: string; setFirst: (v: string) => void;
    last: string; setLast: (v: string) => void;
    address: string; setAddress: (v: string) => void;
    country: string; setCountry: (v: string) => void;
    state: string; setState: (v: string) => void;
    zip: string; setZip: (v: string) => void;
    phone1: string; setPhone1: (v: string) => void;
    phone2: string; setPhone2: (v: string) => void;
    code: string[]; setCode: React.Dispatch<React.SetStateAction<string[]>>;
    sign: string; setSign: React.Dispatch<React.SetStateAction<string>>;
    countryCode: string; setCountryCode: (v: string) => void;
    countryFocused: boolean; setCountryFocused: (v: boolean) => void;
    stateFocused: boolean; setStateFocused: (v: boolean) => void;
    zipError: string | null; setZipError: (v: string | null) => void;
    firstRef: React.RefObject<HTMLDivElement | null>;
    lastRef: React.RefObject<HTMLDivElement | null>;
    addressRef: React.RefObject<HTMLDivElement | null>;
    countryRef: React.RefObject<HTMLDivElement | null>;
    stateRef: React.RefObject<HTMLDivElement | null>;
    zipRef: React.RefObject<HTMLDivElement | null>;
    phoneRef: React.RefObject<HTMLDivElement | null>;
    activeField: string;
    pos: { top: number; left: number } | null;
    onFocus: (f: string) => void;
    onBlur: () => void;
    countrySuggestions: string[];
    stateSuggestions: string[];
}

export function useBillingShippingForm() {
    // ── Billing state ──────────────────────────────────────────────────────────
    const [billingFirst, setBillingFirst] = useState("");
    const [billingLast, setBillingLast] = useState("");
    const [billingAddress, setBillingAddress] = useState("");
    const [billingCountry, setBillingCountry] = useState("");
    const [billingState, setBillingState] = useState("");
    const [billingZip, setBillingZip] = useState("");
    const [billingPhone1, setBillingPhone1] = useState("");
    const [billingPhone2, setBillingPhone2] = useState("");
    const [billingCode, setBillingCode] = useState(["9", "1", ""]);
    const [billingSign, setBillingSign] = useState("+");
    const [billingCountryCode, setBillingCountryCode] = useState("");
    const [billingCountryFocused, setBillingCountryFocused] = useState(false);
    const [billingStateFocused, setBillingStateFocused] = useState(false);

    // ── Shipping state ─────────────────────────────────────────────────────────
    const [shippingFirst, setShippingFirst] = useState("");
    const [shippingLast, setShippingLast] = useState("");
    const [shippingAddress, setShippingAddress] = useState("");
    const [shippingCountry, setShippingCountry] = useState("");
    const [shippingState, setShippingState] = useState("");
    const [shippingZip, setShippingZip] = useState("");
    const [shippingPhone1, setShippingPhone1] = useState("");
    const [shippingPhone2, setShippingPhone2] = useState("");
    const [shippingCode, setShippingCode] = useState(["9", "1", ""]);
    const [shippingSign, setShippingSign] = useState("+");
    const [shippingCountryCode, setShippingCountryCode] = useState("");
    const [shippingCountryFocused, setShippingCountryFocused] = useState(false);
    const [shippingStateFocused, setShippingStateFocused] = useState(false);

    const [correctedFields, setCorrectedFields] = useState<Set<string>>(new Set());
    const [billingZipError, setBillingZipError] = useState<string | null>(null);
    const [shippingZipError, setShippingZipError] = useState<string | null>(null);
    const [showShipping, setShowShipping] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ── Active field tracking ──────────────────────────────────────────────────
    const [activeBilling, setActiveBilling] = useState("bFirst");
    const [activeShipping, setActiveShipping] = useState("sFirst");

    // Two effects with constant dep-array sizes (React rule).
    const [, forceUpdate] = useState(0);
    const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
    void focusedIdx; void setFocusedIdx;

    // One ref per individual input pill so the indicator centers over that pill only.
    const bFirstRef = useRef<HTMLDivElement>(null);
    const bLastRef = useRef<HTMLDivElement>(null);
    const bAddressRef = useRef<HTMLDivElement>(null);
    const bCountryRef = useRef<HTMLDivElement>(null);
    const bStateRef = useRef<HTMLDivElement>(null);
    const bZipRef = useRef<HTMLDivElement>(null);
    const bPhoneRef = useRef<HTMLDivElement>(null);

    const sFirstRef = useRef<HTMLDivElement>(null);
    const sLastRef = useRef<HTMLDivElement>(null);
    const sAddressRef = useRef<HTMLDivElement>(null);
    const sCountryRef = useRef<HTMLDivElement>(null);
    const sStateRef = useRef<HTMLDivElement>(null);
    const sZipRef = useRef<HTMLDivElement>(null);
    const sPhoneRef = useRef<HTMLDivElement>(null);

    const idempotencyKeyRef = useRef<string>("");

    useEffect(() => { forceUpdate(n => n + 1); }, []);
    useEffect(() => { forceUpdate(n => n + 1); }, [showShipping]);
    useEffect(() => {
        const STORAGE_KEY = "order:idempotency-key";
        let key = sessionStorage.getItem(STORAGE_KEY);
        if (!key) {
            key = crypto.randomUUID();
            sessionStorage.setItem(STORAGE_KEY, key);
        }
        idempotencyKeyRef.current = key;
    }, []);

    // ── Indicator positions ────────────────────────────────────────────────────
    const billingRefMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
        bFirst: bFirstRef, bLast: bLastRef, bAddress: bAddressRef,
        bCountry: bCountryRef, bState: bStateRef, bZip: bZipRef, bPhone: bPhoneRef,
    };
    const bPos = indicatorPos(billingRefMap[activeBilling]?.current ?? null);

    const shippingRefMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
        sFirst: sFirstRef, sLast: sLastRef, sAddress: sAddressRef,
        sCountry: sCountryRef, sState: sStateRef, sZip: sZipRef, sPhone: sPhoneRef,
    };
    const sPos = indicatorPos(shippingRefMap[activeShipping]?.current ?? null);

    const onBillingFocus = useCallback((f: string) => setActiveBilling(f), []);
    const onBillingBlur = useCallback(() => setActiveBilling("bFirst"), []);
    const onShippingFocus = useCallback((f: string) => setActiveShipping(f), []);
    const onShippingBlur = useCallback(() => setActiveShipping("sFirst"), []);

    const router = useRouter();
    const searchParams = useSearchParams();

    // qty arrives as ?qty=N from /order/units; clamp to the server-enforced range.
    const quantity = (() => {
        const raw = Number(searchParams.get("qty"));
        if (!Number.isFinite(raw) || raw < 1) return 1;
        if (raw > 5) return 5;
        return Math.floor(raw);
    })();

    function extractDigits(s: string): string {
        return s.replace(/\D/g, "");
    }

    function buildAddress(side: "billing" | "shipping") {
        const isB = side === "billing";
        return {
            firstName: (isB ? billingFirst : shippingFirst).trim(),
            lastName: (isB ? billingLast : shippingLast).trim(),
            line1: (isB ? billingAddress : shippingAddress).trim(),
            country: (isB ? billingCountry : shippingCountry).trim(),
            state: (isB ? billingState : shippingState).trim(),
            zip: (isB ? billingZip : shippingZip).trim(),
            phoneCountryCode: extractDigits((isB ? billingCode : shippingCode).join("")),
            phone: isB ? billingPhone1 + billingPhone2 : shippingPhone1 + shippingPhone2,
            phoneSign: (isB ? billingSign : shippingSign) as "+" | "-",
        };
    }

    async function handleProceed() {
        if (submitting) return;
        setErrorMsg(null);

        const billing = buildAddress("billing");
        // "Same as Billing" → copy billing into shipping client-side so the
        // server always receives both addresses (user decision 2026-04-21).
        const shipping = showShipping ? buildAddress("shipping") : billing;

        setSubmitting(true);
        try {
            // ── Address validation ────────────────────────────────────────────
            type ValidateResult = { valid: boolean; error?: string; corrections?: { zip?: string; state?: string } };

            const validateSide = async (addr: ReturnType<typeof buildAddress>, countryCode: string): Promise<ValidateResult> => {
                const res = await apiFetch("/api/validate-address", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ line1: addr.line1, state: addr.state, zip: addr.zip, countryCode }),
                });
                return res.json();
            };

            const [billingResult, shippingResult] = await Promise.all([
                validateSide(billing, billingCountryCode),
                showShipping ? validateSide(shipping, shippingCountryCode) : Promise.resolve({ valid: true } as ValidateResult),
            ]);

            if (!billingResult.valid) {
                setBillingZipError("Incorrect pincode/zipcode");
                return;
            }
            if (!shippingResult.valid) {
                setShippingZipError("Incorrect pincode/zipcode");
                return;
            }
            setBillingZipError(null);
            setShippingZipError(null);

            const newCorrected = new Set<string>();
            if (billingResult.corrections?.zip) { setBillingZip(billingResult.corrections.zip); newCorrected.add("bZip"); }
            if (billingResult.corrections?.state) { setBillingState(billingResult.corrections.state); newCorrected.add("bState"); }
            if (shippingResult.corrections?.zip) { setShippingZip(shippingResult.corrections.zip); newCorrected.add("sZip"); }
            if (shippingResult.corrections?.state) { setShippingState(shippingResult.corrections.state); newCorrected.add("sState"); }

            if (newCorrected.size > 0) {
                setCorrectedFields(newCorrected);
                setErrorMsg("Address corrected — review highlighted fields and proceed again.");
                return;
            }

            setCorrectedFields(new Set());

            // ── Place order ───────────────────────────────────────────────────
            const res = await apiFetch("/api/orders", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    quantity,
                    billingAddress: billing,
                    shippingAddress: shipping,
                    idempotencyKey: idempotencyKeyRef.current,
                }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.ok) {
                setErrorMsg(body?.error?.message ?? "Could not place order. Please check your details and try again.");
                return;
            }
            const orderId = body.data.id as string;
            router.push(`/order/payment?orderId=${orderId}`);
        } catch {
            setErrorMsg("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    // ── Country / state suggestions (derived, no extra state) ─────────────────
    const billingCountrySuggestions = billingCountryFocused && billingCountry.length > 0
        ? COUNTRIES.filter(c => c.name.toLowerCase().startsWith(billingCountry.toLowerCase())).slice(0, 6).map(c => c.name)
        : [];
    const billingStateSuggestions = billingStateFocused && billingCountryCode
        ? (STATES[billingCountryCode] ?? []).filter(s => s.toLowerCase().startsWith(billingState.toLowerCase())).slice(0, 6)
        : [];
    const shippingCountrySuggestions = shippingCountryFocused && shippingCountry.length > 0
        ? COUNTRIES.filter(c => c.name.toLowerCase().startsWith(shippingCountry.toLowerCase())).slice(0, 6).map(c => c.name)
        : [];
    const shippingStateSuggestions = shippingStateFocused && shippingCountryCode
        ? (STATES[shippingCountryCode] ?? []).filter(s => s.toLowerCase().startsWith(shippingState.toLowerCase())).slice(0, 6)
        : [];

    const billing: AddressFormState = {
        first: billingFirst, setFirst: setBillingFirst,
        last: billingLast, setLast: setBillingLast,
        address: billingAddress, setAddress: setBillingAddress,
        country: billingCountry, setCountry: setBillingCountry,
        state: billingState, setState: setBillingState,
        zip: billingZip, setZip: setBillingZip,
        phone1: billingPhone1, setPhone1: setBillingPhone1,
        phone2: billingPhone2, setPhone2: setBillingPhone2,
        code: billingCode, setCode: setBillingCode,
        sign: billingSign, setSign: setBillingSign,
        countryCode: billingCountryCode, setCountryCode: setBillingCountryCode,
        countryFocused: billingCountryFocused, setCountryFocused: setBillingCountryFocused,
        stateFocused: billingStateFocused, setStateFocused: setBillingStateFocused,
        zipError: billingZipError, setZipError: setBillingZipError,
        firstRef: bFirstRef, lastRef: bLastRef, addressRef: bAddressRef,
        countryRef: bCountryRef, stateRef: bStateRef, zipRef: bZipRef, phoneRef: bPhoneRef,
        activeField: activeBilling,
        pos: bPos,
        onFocus: onBillingFocus,
        onBlur: onBillingBlur,
        countrySuggestions: billingCountrySuggestions,
        stateSuggestions: billingStateSuggestions,
    };

    const shipping: AddressFormState = {
        first: shippingFirst, setFirst: setShippingFirst,
        last: shippingLast, setLast: setShippingLast,
        address: shippingAddress, setAddress: setShippingAddress,
        country: shippingCountry, setCountry: setShippingCountry,
        state: shippingState, setState: setShippingState,
        zip: shippingZip, setZip: setShippingZip,
        phone1: shippingPhone1, setPhone1: setShippingPhone1,
        phone2: shippingPhone2, setPhone2: setShippingPhone2,
        code: shippingCode, setCode: setShippingCode,
        sign: shippingSign, setSign: setShippingSign,
        countryCode: shippingCountryCode, setCountryCode: setShippingCountryCode,
        countryFocused: shippingCountryFocused, setCountryFocused: setShippingCountryFocused,
        stateFocused: shippingStateFocused, setStateFocused: setShippingStateFocused,
        zipError: shippingZipError, setZipError: setShippingZipError,
        firstRef: sFirstRef, lastRef: sLastRef, addressRef: sAddressRef,
        countryRef: sCountryRef, stateRef: sStateRef, zipRef: sZipRef, phoneRef: sPhoneRef,
        activeField: activeShipping,
        pos: sPos,
        onFocus: onShippingFocus,
        onBlur: onShippingBlur,
        countrySuggestions: shippingCountrySuggestions,
        stateSuggestions: shippingStateSuggestions,
    };

    return {
        billing,
        shipping,
        correctedFields,
        setCorrectedFields,
        showShipping,
        setShowShipping,
        submitting,
        errorMsg,
        handleProceed,
    };
}
