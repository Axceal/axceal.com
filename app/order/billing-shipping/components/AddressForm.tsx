"use client";
import { SvgText } from "../../../components/SvgText";
import { SvgInput } from "../../../components/SvgInput";
import { SuggestionPills } from "../../../components/SuggestionPills";
import { DisableCircle } from "../../../components/icons/DisableCircle";
import type { AddressFormState } from "../hooks/useBillingShippingForm";
import countriesData from "../../../data/countries.json";

const COUNTRIES = countriesData as { name: string; code: string; dialCode: string }[];

const pill = "bg-[#f1f1f1] text-[#1e1e1e] rounded-full px-5 py-[18px]";
const corrPill = "bg-[#e8ecff] text-[#1e1e1e] rounded-full px-5 py-[18px] ring-1 ring-[#0000f4]/40";

interface AddressFormProps {
    form: AddressFormState;
    correctedFields: Set<string>;
    setCorrectedFields: React.Dispatch<React.SetStateAction<Set<string>>>;
    title: string;
    nameLabel: string;
    fieldPrefix: "b" | "s";
    footer?: React.ReactNode;
}

export function AddressForm({
    form,
    correctedFields,
    setCorrectedFields,
    title,
    nameLabel,
    fieldPrefix,
    footer,
}: AddressFormProps) {
    const indicatorColor = form.zipError && form.activeField === `${fieldPrefix}Zip`
        ? "bg-[#ff0000]"
        : "bg-[#0000f4]";

    return (
        <div className="relative flex flex-col gap-4 w-full max-w-[430px]">

            {/* Blue sliding indicator — left derived from active input's offsetLeft+width */}
            <div
                className={`absolute w-[40px] h-[2.5px] rounded-full pointer-events-none transition-[top,left,opacity,background-color] duration-200 ease-in-out ${indicatorColor}`}
                style={{
                    top: form.pos ? `${form.pos.top}px` : undefined,
                    left: form.pos ? `${form.pos.left}px` : undefined,
                    opacity: form.pos ? 1 : 0,
                }}
            />

            <div className="flex flex-col items-center gap-1.5 mb-2">
                <SvgText text={title} weight="600" height={18} className="text-[#1e1e1e]" />
            </div>

            {/* Name — each pill gets its own ref so indicator centers over just that pill */}
            <div className="w-full flex items-center gap-3">
                <SvgText
                    text={nameLabel}
                    weight="600"
                    height={14}
                    className="text-[#1e1e1e] shrink-0 w-[90px] "
                />
                <div ref={form.firstRef} className="flex-1">
                    <SvgInput
                        value={form.first}
                        onChange={v => form.setFirst(v.replace(/\d/g, ""))}
                        placeholder="First Name"
                        align="center"
                        weight="600"
                        height={14}
                        className={`w-full ${pill} flex`}
                        onFocus={() => form.onFocus(`${fieldPrefix}First`)}
                        onBlur={form.onBlur}
                    />
                </div>
                <div ref={form.lastRef} className="flex-1">
                    <SvgInput
                        value={form.last}
                        onChange={v => form.setLast(v.replace(/\d/g, ""))}
                        placeholder="Last Name"
                        weight="600"
                        align="center"
                        height={14}
                        className={`w-full ${pill}`}
                        onFocus={() => form.onFocus(`${fieldPrefix}Last`)}
                        onBlur={form.onBlur}
                    />
                </div>
            </div>

            {/* Home Address — full width, no label */}
            <div ref={form.addressRef} className="w-full">
                <SvgInput
                    value={form.address}
                    onChange={(v) => { if (v.length <= 50) form.setAddress(v); }}
                    placeholder="Home Address"
                    weight="600"
                    height={14}
                    className={`w-full ${pill} px-8`}
                    onFocus={() => form.onFocus(`${fieldPrefix}Address`)}
                    onBlur={form.onBlur}
                    rightSlot={
                        <SvgText text="50 characters" weight="600" height={14} className="text-[#aaaaaa] pr-2 shrink-0" />
                    }
                />
            </div>

            {/* Country + State — each pill gets its own ref */}
            <div className="w-full flex flex-col gap-2">
                <div className="flex gap-3">
                    <div ref={form.countryRef} className="flex-1">
                        <SvgInput
                            value={form.country}
                            onChange={v => {
                                form.setCountry(v.replace(/\d/g, ""));
                                form.setCountryCode("");
                                form.setState("");
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
                                setCorrectedFields(f => { const n = new Set(f); n.delete(`${fieldPrefix}State`); return n; });
                            }}
                            placeholder="State"
                            weight="600"
                            align="center"
                            height={14}
                            className={`w-full ${correctedFields.has(`${fieldPrefix}State`) ? corrPill : pill}`}
                            onFocus={() => { form.onFocus(`${fieldPrefix}State`); form.setStateFocused(true); }}
                            onBlur={() => { form.onBlur(); form.setStateFocused(false); }}
                        />
                    </div>
                </div>
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
                                const digits = found.dialCode.replace(/\D/g, "").slice(0, 3).split("");
                                form.setCode([digits[0] ?? "", digits[1] ?? "", digits[2] ?? ""]);
                            }
                        } else {
                            form.setState(val);
                            setCorrectedFields(f => { const n = new Set(f); n.delete(`${fieldPrefix}State`); return n; });
                            form.setStateFocused(false);
                        }
                    }}
                />
            </div>

            {/* Zip */}
            <div ref={form.zipRef} className="w-full">
                <SvgInput
                    value={form.zip}
                    onChange={v => {
                        form.setZip(v.replace(/[a-zA-Z]/g, ""));
                        setCorrectedFields(f => { const n = new Set(f); n.delete(`${fieldPrefix}Zip`); return n; });
                        form.setZipError(null);
                    }}
                    placeholder="zipcode/pincode"
                    weight="600"
                    height={14}
                    align="center"
                    className={`w-full ${correctedFields.has(`${fieldPrefix}Zip`) ? corrPill : pill}`}
                    onFocus={() => form.onFocus(`${fieldPrefix}Zip`)}
                    onBlur={form.onBlur}
                />
            </div>

            {/* Zip error */}
            {form.zipError && (
                <div className="w-full flex justify-center">
                    <SvgText text={form.zipError} weight="600" height={14} className="text-[#ff0000]" />
                </div>
            )}

            {/* Phone — 4-circle country code + grouped number input */}
            <div
                ref={form.phoneRef}
                className="w-full flex items-center gap-2 h-[50px] bg-[#f1f1f1] rounded-full px-[6px]"
                onFocus={() => form.onFocus(`${fieldPrefix}Phone`)}
                onBlur={form.onBlur}
            >
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => form.setSign(s => s === "+" ? "-" : "+")}
                        className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center cursor-pointer focus:outline-none focus-visible:outline-none hover:bg-gray-50 transition-colors shrink-0"
                    >
                        <SvgText text={form.sign} weight="600" height={18} className="text-[#0000f4]" />
                    </button>
                    {form.code.map((val, i) => (
                        <div key={i} className="relative w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center shrink-0">
                            <input
                                id={`${fieldPrefix}code-${i}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={val}
                                onChange={(e) => {
                                    const cleanV = e.target.value.replace(/\D/g, "");
                                    const newCode = [...form.code];
                                    newCode[i] = cleanV.slice(-1);
                                    form.setCode(newCode);
                                    if (cleanV && i < 2) {
                                        const next = document.getElementById(`${fieldPrefix}code-${i + 1}`);
                                        if (next) next.focus();
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Backspace" && !val && i > 0) {
                                        const prev = document.getElementById(`${fieldPrefix}code-${i - 1}`);
                                        if (prev) prev.focus();
                                    }
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10 outline-none"
                            />
                            {val ? (
                                <SvgText text={val} weight="600" height={16} className="text-[#0000f4]" />
                            ) : (
                                <DisableCircle />
                            )}
                        </div>
                    ))}
                </div>

                <div className="w-[2px] h-[20px] rounded-full bg-[#aaaaaa] shrink-0 mx-1" />

                <SvgInput
                    id={`${fieldPrefix}phone1`}
                    value={form.phone1}
                    onChange={v => {
                        const d = v.replace(/\D/g, "").slice(0, 5);
                        form.setPhone1(d);
                        if (d.length === 5) document.getElementById(`${fieldPrefix}phone2`)?.focus();
                    }}
                    placeholder="9xxxx"
                    weight="600"
                    height={16}
                    align="right"
                    className="flex-1 text-[#1e1e1e]"
                />
                <SvgText text="-" weight="600" height={16} className="text-[#aaaaaa] shrink-0" />
                <SvgInput
                    id={`${fieldPrefix}phone2`}
                    value={form.phone2}
                    onChange={v => form.setPhone2(v.replace(/\D/g, "").slice(0, 5))}
                    onKeyDown={e => {
                        if (e.key === "Backspace" && !form.phone2) document.getElementById(`${fieldPrefix}phone1`)?.focus();
                    }}
                    placeholder="9xxxx"
                    weight="600"
                    height={16}
                    align="left"
                    className="flex-1 text-[#1e1e1e]"
                />
            </div>

            {footer}
        </div>
    );
}
