"use client";
import { useCallback, useRef, useState } from "react";
import countriesData from "../../../data/countries.json";
import statesData from "../../../data/states.json";
import {
    type AddressFormState,
    type AddressPayload,
    type FieldErrorMap,
    indicatorPos,
} from "./types";

const COUNTRIES = countriesData as { name: string; code: string; dialCode: string }[];
const STATES = statesData as Record<string, string[]>;

// One side ("billing" or "shipping") of the form. Owns all field state and
// derives the AddressFormState the AddressForm component consumes. Pulling
// per-side state out keeps useBillingShippingForm focused on cross-side
// concerns (submit, validation, address corrections).
export function useAddressSide(prefix: "b" | "s") {
    const [first, setFirst] = useState("");
    const [last, setLast] = useState("");
    const [address, setAddress] = useState("");
    const [country, setCountry] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");
    const [phone1, setPhone1] = useState("");
    const [phone2, setPhone2] = useState("");
    const [code, setCode] = useState(["9", "1", ""]);
    const [sign, setSign] = useState("+");
    const [countryCode, setCountryCode] = useState("");
    const [countryFocused, setCountryFocused] = useState(false);
    const [stateFocused, setStateFocused] = useState(false);
    const [zipError, setZipError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
    const [activeField, setActiveField] = useState(`${prefix}First`);

    const firstRef = useRef<HTMLDivElement>(null);
    const lastRef = useRef<HTMLDivElement>(null);
    const addressRef = useRef<HTMLDivElement>(null);
    const countryRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef<HTMLDivElement>(null);
    const zipRef = useRef<HTMLDivElement>(null);
    const phoneRef = useRef<HTMLDivElement>(null);

    const refMap: Record<string, React.RefObject<HTMLDivElement | null>> = {
        [`${prefix}First`]: firstRef,
        [`${prefix}Last`]: lastRef,
        [`${prefix}Address`]: addressRef,
        [`${prefix}Country`]: countryRef,
        [`${prefix}State`]: stateRef,
        [`${prefix}Zip`]: zipRef,
        [`${prefix}Phone`]: phoneRef,
    };
    const pos = indicatorPos(refMap[activeField]?.current ?? null);

    const onFocus = useCallback((f: string) => setActiveField(f), []);
    const onBlur = useCallback(() => setActiveField(`${prefix}First`), [prefix]);

    const clearFieldError = useCallback((field: keyof FieldErrorMap) => {
        setFieldErrors(e => { const n = { ...e }; delete n[field]; return n; });
    }, []);

    const countrySuggestions = countryFocused && country.length > 0
        ? COUNTRIES.filter(c => c.name.toLowerCase().startsWith(country.toLowerCase())).slice(0, 6).map(c => c.name)
        : [];
    const stateSuggestions = stateFocused && countryCode
        ? (STATES[countryCode] ?? []).filter(s => s.toLowerCase().startsWith(state.toLowerCase())).slice(0, 6)
        : [];

    const formState: AddressFormState = {
        first, setFirst,
        last, setLast,
        address, setAddress,
        country, setCountry,
        state, setState,
        zip, setZip,
        phone1, setPhone1,
        phone2, setPhone2,
        code, setCode,
        sign, setSign,
        countryCode, setCountryCode,
        countryFocused, setCountryFocused,
        stateFocused, setStateFocused,
        zipError, setZipError,
        fieldErrors, clearFieldError,
        firstRef, lastRef, addressRef, countryRef, stateRef, zipRef, phoneRef,
        activeField,
        pos,
        onFocus, onBlur,
        countrySuggestions, stateSuggestions,
    };

    const buildPayload = (): AddressPayload => ({
        firstName: first.trim(),
        lastName: last.trim(),
        line1: address.trim(),
        country: country.trim(),
        state: state.trim(),
        zip: zip.trim(),
        phoneCountryCode: code.join("").replace(/\D/g, ""),
        phone: phone1 + phone2,
        phoneSign: sign as "+" | "-",
    });

    return {
        formState,
        countryCode,
        setFieldErrors,
        buildPayload,
        // Setters needed by the submit path for address-correction writes.
        setZip,
        setState,
    };
}
