/* eslint-disable react-hooks/refs */
import { SvgText } from "../../../components/text/SvgText";
import { SvgInput } from "../../../components/text/SvgInput";
import { DisableCircle } from "../../../components/icons/state/DisableCircle";
import { SearchIcon } from "../../../components/icons/action/SearchIcon";
import { CountrySearchModal } from "../../../components/modal/CountrySearchModal";
import type { AddressFormState } from "../hooks/useBillingShippingForm";
import { FieldError } from "./FieldError";
import React, { useState } from "react";

export function PhoneRow({
    form,
    fieldPrefix,
}: {
    form: AddressFormState;
    fieldPrefix: "b" | "s";
}) {
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [showCountrySearch, setShowCountrySearch] = useState(false);

    const p1Arr = Array.from({ length: 5 }, (_, i) => form.phone1[i] || "");
    const p2Arr = Array.from({ length: 5 }, (_, i) => form.phone2[i] || "");

    const handlePhoneChange = (part: 1 | 2, i: number, val: string) => {
        const cleanVal = val.replace(/\D/g, "");
        if (!cleanVal) {
            if (part === 1) {
                const arr = [...p1Arr];
                arr[i] = "";
                form.setPhone1(arr.join(""));
            } else {
                const arr = [...p2Arr];
                arr[i] = "";
                form.setPhone2(arr.join(""));
            }
            return;
        }

        const digit = cleanVal.slice(-1);
        if (part === 1) {
            const arr = [...p1Arr];
            arr[i] = digit;
            form.setPhone1(arr.join(""));
            if (i < 4) document.getElementById(`${fieldPrefix}phone1-${i + 1}`)?.focus();
            else document.getElementById(`${fieldPrefix}phone2-0`)?.focus();
        } else {
            const arr = [...p2Arr];
            arr[i] = digit;
            form.setPhone2(arr.join(""));
            if (i < 4) document.getElementById(`${fieldPrefix}phone2-${i + 1}`)?.focus();
        }
        form.clearFieldError("phone");
    };

    const handlePhoneKeyDown = (part: 1 | 2, i: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace") {
            const arr = part === 1 ? p1Arr : p2Arr;
            if (!arr[i]) {
                if (i > 0) {
                    document.getElementById(`${fieldPrefix}phone${part}-${i - 1}`)?.focus();
                } else if (part === 2) {
                    document.getElementById(`${fieldPrefix}phone1-4`)?.focus();
                }
            }
        }
    };

    return (
        <div className="w-full flex flex-col gap-2">
            <div
                ref={form.phoneRef}
                className="w-full flex items-center gap-[5px] h-[50px] bg-[#f1f1f1] rounded-full p-[5px]"
                onFocus={() => form.onFocus(`${fieldPrefix}Phone`)}
                onBlur={form.onBlur}
            >
                <div 
                    className="flex items-center gap-[5px] cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                    onClick={() => setShowCountrySearch(true)}
                >
                    <div className="w-[40px] h-[40px] bg-white rounded-full flex items-center justify-center shrink-0">
                        <SvgText text={form.sign} weight="600" height={16} className="text-[#0000f4]" />
                    </div>
                    {form.code.map((digit, i) => (
                        <div key={`cc-${i}`} className="w-[40px] h-[40px] bg-white rounded-full flex items-center justify-center shrink-0">
                            <SvgText text={digit} weight="600" height={16} className="text-[#1e1e1e]" />
                        </div>
                    ))}
                </div>

                <div
                    className="bg-white h-[40px] rounded-full flex-1 flex items-center justify-around px-2 md:px-4 cursor-text"
                    onClick={() => {
                        const firstEmptyIdx1 = p1Arr.findIndex(d => !d);
                        if (firstEmptyIdx1 !== -1) {
                            document.getElementById(`${fieldPrefix}phone1-${firstEmptyIdx1}`)?.focus();
                        } else {
                            const firstEmptyIdx2 = p2Arr.findIndex(d => !d);
                            const targetIdx2 = firstEmptyIdx2 === -1 ? 4 : firstEmptyIdx2;
                            document.getElementById(`${fieldPrefix}phone2-${targetIdx2}`)?.focus();
                        }
                    }}
                >
                    {p1Arr.map((digit, i) => {
                        const id = `${fieldPrefix}phone1-${i}`;
                        return (
                            <div key={id} className="flex-1 flex items-center justify-center h-full transition-all">
                                <SvgInput
                                    id={id}
                                    value={digit}
                                    placeholder={focusedId === id ? "" : "X"}
                                    onChange={val => handlePhoneChange(1, i, val)}
                                    onKeyDown={e => handlePhoneKeyDown(1, i, e)}
                                    onFocus={() => setFocusedId(id)}
                                    onBlur={() => setFocusedId(current => current === id ? null : current)}
                                    height={16}
                                    weight="600"
                                    align="center"
                                    className={`w-full ${digit || focusedId === id ? "text-[#0000f4]" : "text-[#aaaaaa]"}`}
                                />
                            </div>
                        );
                    })}
                    {p2Arr.map((digit, i) => {
                        const id = `${fieldPrefix}phone2-${i}`;
                        return (
                            <div key={id} className="flex-1 flex items-center justify-center h-full transition-all">
                                <SvgInput
                                    id={id}
                                    value={digit}
                                    placeholder={focusedId === id ? "" : "X"}
                                    onChange={val => handlePhoneChange(2, i, val)}
                                    onKeyDown={e => handlePhoneKeyDown(2, i, e)}
                                    onFocus={() => setFocusedId(id)}
                                    onBlur={() => setFocusedId(current => current === id ? null : current)}
                                    height={16}
                                    weight="600"
                                    align="center"
                                    className={`w-full ${digit || focusedId === id ? "text-[#0000f4]" : "text-[#aaaaaa]"}`}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
            <FieldError msg={form.fieldErrors.phone} />

            <CountrySearchModal
                isOpen={showCountrySearch}
                onClose={() => setShowCountrySearch(false)}
                onConfirm={(c) => {
                    form.setCode(c.dialCode.split(""));
                }}
            />
        </div>
    );
}
