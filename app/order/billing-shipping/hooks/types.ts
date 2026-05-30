import type { Dispatch, RefObject, SetStateAction } from "react";

export type FieldErrorMap = Partial<
  Record<"first" | "last" | "address" | "country" | "state" | "zip" | "phone", string>
>;

export interface AddressFormState {
    first: string; setFirst: (v: string) => void;
    last: string; setLast: (v: string) => void;
    address: string; setAddress: (v: string) => void;
    country: string; setCountry: (v: string) => void;
    state: string; setState: (v: string) => void;
    zip: string; setZip: (v: string) => void;
    phone1: string; setPhone1: (v: string) => void;
    phone2: string; setPhone2: (v: string) => void;
    code: string[]; setCode: Dispatch<SetStateAction<string[]>>;
    sign: string; setSign: Dispatch<SetStateAction<string>>;
    countryCode: string; setCountryCode: (v: string) => void;
    countryFocused: boolean; setCountryFocused: (v: boolean) => void;
    stateFocused: boolean; setStateFocused: (v: boolean) => void;
    zipError: string | null; setZipError: (v: string | null) => void;
    fieldErrors: FieldErrorMap;
    clearFieldError: (field: keyof FieldErrorMap) => void;
    firstRef: RefObject<HTMLDivElement | null>;
    lastRef: RefObject<HTMLDivElement | null>;
    addressRef: RefObject<HTMLDivElement | null>;
    countryRef: RefObject<HTMLDivElement | null>;
    stateRef: RefObject<HTMLDivElement | null>;
    zipRef: RefObject<HTMLDivElement | null>;
    phoneRef: RefObject<HTMLDivElement | null>;
    activeField: string;
    pos: { top: number; left: number } | null;
    onFocus: (f: string) => void;
    onBlur: () => void;
    countrySuggestions: string[];
    stateSuggestions: string[];
}

export type AddressPayload = {
    firstName: string;
    lastName: string;
    line1: string;
    country: string;
    state: string;
    zip: string;
    phoneCountryCode: string;
    phone: string;
    phoneSign: "+" | "-";
};

export function indicatorPos(el: HTMLDivElement | null): { top: number; left: number } | null {
    if (!el) return null;
    return {
        top: el.offsetTop - 2.5,
        left: el.offsetLeft + el.offsetWidth / 2 - 20,
    };
}

export function validateAddressFields(
    addr: AddressPayload,
    countryCode: string,
    side: "billing" | "shipping",
): FieldErrorMap {
    const to = side;
    const e: FieldErrorMap = {};
    if (!addr.firstName) e.first = `Add first name to ${to}`;
    if (!addr.lastName) e.last = `Add last name to ${to}`;
    if (!addr.line1) e.address = `Add home address to ${to}`;
    if (!addr.country) e.country = `Add country to ${to}`;
    else if (!countryCode) e.country = `Select a country from the list.`;
    if (!addr.state) e.state = `Add state to ${to}`;
    if (!addr.zip) e.zip = `Add zip / pincode to ${to}`;
    if ((addr.phone?.length ?? 0) < 7) e.phone = `Add valid phone number to ${to}`;
    return e;
}

export function extractDigits(s: string): string {
    return s.replace(/\D/g, "");
}
