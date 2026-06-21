/* eslint-disable react-hooks/refs */
import React, { useState } from "react";
import { SvgText } from "../../../components/text/SvgText";
import { RegionSearchModal } from "../../../components/modal/RegionSearchModal";
import type { AddressFormState } from "../hooks/useBillingShippingForm";
import countriesData from "../../../data/countries.json";
import statesData from "../../../data/states.json";
import { FieldError } from "./FieldError";
import { pill, corrPill } from "./addressFormStyles";

const COUNTRIES = countriesData as { name: string; code: string; dialCode: string }[];
const STATES = statesData as Record<string, string[]>;

export function CountryStateRow({
    form,
    fieldPrefix,
    correctedFields,
    setCorrectedFields,
}: {
    form: AddressFormState;
    fieldPrefix: "b" | "s";
    correctedFields: Set<string>;
    setCorrectedFields: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
    const stateKey = `${fieldPrefix}State`;
    const [modalType, setModalType] = useState<"country" | "state" | null>(null);

    const countryNames = COUNTRIES.map(c => c.name);
    const stateNames = form.countryCode ? (STATES[form.countryCode] || []) : [];

    return (
        <div className="w-full flex flex-col gap-2">
            <div className="flex gap-3">
                <div ref={form.countryRef} className="flex-1">
                    <div 
                        className={`w-full flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80 ${pill}`}
                        onClick={() => setModalType("country")}
                    >
                        <SvgText 
                            text={form.country || "Country"} 
                            weight="600" 
                            height={14} 
                            className={form.country ? "text-[#1e1e1e]" : "text-[#aaaaaa]"} 
                        />
                    </div>
                </div>
                <div ref={form.stateRef} className="flex-1">
                    <div 
                        className={`w-full flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80 ${correctedFields.has(stateKey) ? corrPill : pill}`}
                        onClick={() => {
                            if (form.countryCode) {
                                setModalType("state");
                            }
                        }}
                        style={{ opacity: form.countryCode ? 1 : 0.5, cursor: form.countryCode ? "pointer" : "not-allowed" }}
                    >
                        <SvgText 
                            text={form.state || "State"} 
                            weight="600" 
                            height={14} 
                            className={form.state ? "text-[#1e1e1e]" : "text-[#aaaaaa]"} 
                        />
                    </div>
                </div>
            </div>
            {(form.fieldErrors.country || form.fieldErrors.state) && (
                <div className="flex gap-3">
                    <div className="flex-1 flex justify-center">
                        <FieldError msg={form.fieldErrors.country} />
                    </div>
                    <div className="flex-1 flex justify-center">
                        <FieldError msg={form.fieldErrors.state} />
                    </div>
                </div>
            )}

            <RegionSearchModal
                isOpen={modalType !== null}
                onClose={() => setModalType(null)}
                type={modalType || "country"}
                items={modalType === "country" ? countryNames : stateNames}
                onConfirm={(val) => {
                    if (modalType === "country") {
                        const found = COUNTRIES.find(c => c.name === val);
                        if (found) {
                            form.setCountry(val);
                            form.setCountryCode(found.code);
                            form.setState("");
                            form.clearFieldError("country");
                            const digits = found.dialCode.replace(/\D/g, "").slice(0, 3).split("");
                            form.setCode([digits[0] ?? "", digits[1] ?? "", digits[2] ?? ""].filter(Boolean));
                        }
                    } else if (modalType === "state") {
                        form.setState(val);
                        setCorrectedFields(f => { const n = new Set(f); n.delete(stateKey); return n; });
                        form.clearFieldError("state");
                    }
                }}
            />
        </div>
    );
}
