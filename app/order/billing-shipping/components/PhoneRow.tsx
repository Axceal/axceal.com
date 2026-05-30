/* eslint-disable react-hooks/refs */
import { SvgText } from "../../../components/text/SvgText";
import { SvgInput } from "../../../components/text/SvgInput";
import { DisableCircle } from "../../../components/icons/state/DisableCircle";
import type { AddressFormState } from "../hooks/useBillingShippingForm";
import { FieldError } from "./FieldError";

export function PhoneRow({
    form,
    fieldPrefix,
}: {
    form: AddressFormState;
    fieldPrefix: "b" | "s";
}) {
    return (
        <div className="w-full flex flex-col gap-2">
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
                                        document.getElementById(`${fieldPrefix}code-${i + 1}`)?.focus();
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Backspace" && !val && i > 0) {
                                        document.getElementById(`${fieldPrefix}code-${i - 1}`)?.focus();
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
                        form.clearFieldError("phone");
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
                    onChange={v => {
                        form.setPhone2(v.replace(/\D/g, "").slice(0, 5));
                        form.clearFieldError("phone");
                    }}
                    onKeyDown={e => {
                        if (e.key === "Backspace" && !form.phone2) {
                            document.getElementById(`${fieldPrefix}phone1`)?.focus();
                        }
                    }}
                    placeholder="9xxxx"
                    weight="600"
                    height={16}
                    align="left"
                    className="flex-1 text-[#1e1e1e]"
                />
            </div>
            <FieldError msg={form.fieldErrors.phone} />
        </div>
    );
}
