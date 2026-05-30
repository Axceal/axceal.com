/* eslint-disable react-hooks/refs */
import { SvgInput } from "../../../components/text/SvgInput";
import { SuggestionPills } from "../../../components/form/SuggestionPills";
import type { AddressFormState } from "../hooks/useBillingShippingForm";
import countriesData from "../../../data/countries.json";
import { FieldError } from "./FieldError";
import { pill, corrPill } from "./addressFormStyles";

const COUNTRIES = countriesData as { name: string; code: string; dialCode: string }[];

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

    return (
        <div className="w-full flex flex-col gap-2">
            <div className="flex gap-3">
                <div ref={form.countryRef} className="flex-1">
                    <SvgInput
                        value={form.country}
                        onChange={v => {
                            form.setCountry(v.replace(/\d/g, ""));
                            form.setCountryCode("");
                            form.setState("");
                            form.clearFieldError("country");
                        }}
                        placeholder="Country"
                        weight="600"
                        height={14}
                        align="center"
                        className={`w-full ${pill}`}
                        onFocus={() => { form.onFocus(`${fieldPrefix}Country`); form.setCountryFocused(true); }}
                        onBlur={() => { form.onBlur(); form.setCountryFocused(false); }}
                    />
                </div>
                <div ref={form.stateRef} className="flex-1">
                    <SvgInput
                        value={form.state}
                        onChange={v => {
                            form.setState(v.replace(/\d/g, ""));
                            setCorrectedFields(f => { const n = new Set(f); n.delete(stateKey); return n; });
                            form.clearFieldError("state");
                        }}
                        placeholder="State"
                        weight="600"
                        align="center"
                        height={14}
                        className={`w-full ${correctedFields.has(stateKey) ? corrPill : pill}`}
                        onFocus={() => { form.onFocus(`${fieldPrefix}State`); form.setStateFocused(true); }}
                        onBlur={() => { form.onBlur(); form.setStateFocused(false); }}
                    />
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
            <SuggestionPills
                suggestions={form.countryFocused ? form.countrySuggestions : form.stateSuggestions}
                visible={(form.countryFocused && form.countrySuggestions.length > 0) || (form.stateFocused && form.stateSuggestions.length > 0)}
                onSelect={val => {
                    if (form.countryFocused) {
                        const found = COUNTRIES.find(c => c.name === val);
                        if (found) {
                            form.setCountry(val);
                            form.setCountryCode(found.code);
                            form.setState("");
                            form.setCountryFocused(false);
                            form.clearFieldError("country");
                            const digits = found.dialCode.replace(/\D/g, "").slice(0, 3).split("");
                            form.setCode([digits[0] ?? "", digits[1] ?? "", digits[2] ?? ""]);
                        }
                    } else {
                        form.setState(val);
                        setCorrectedFields(f => { const n = new Set(f); n.delete(stateKey); return n; });
                        form.clearFieldError("state");
                        form.setStateFocused(false);
                    }
                }}
            />
        </div>
    );
}
