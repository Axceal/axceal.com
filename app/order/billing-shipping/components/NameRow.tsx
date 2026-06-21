/* eslint-disable react-hooks/refs --
 * `form` (AddressFormState) bundles state and refs together — see comment in
 * AddressForm.tsx for the rule false-positive context. */
import { SvgText } from "../../../components/text/SvgText";
import { SvgInput } from "../../../components/text/SvgInput";
import type { AddressFormState } from "../hooks/useBillingShippingForm";
import { FieldError } from "./FieldError";
import { pill } from "./addressFormStyles";

export function NameRow({
    form,
    nameLabel,
    fieldPrefix,
}: {
    form: AddressFormState;
    nameLabel: string;
    fieldPrefix: "b" | "s";
}) {
    return (
        <div className="w-full flex items-center gap-3">
            <SvgText
                text={nameLabel}
                weight="600"
                height={14}
                className="text-[#1e1e1e] shrink-0 w-[90px] mt-[18px]"
            />
            <div ref={form.firstRef} className="flex-1 flex flex-col items-center gap-2">
                <SvgInput
                    value={form.first}
                    onChange={v => { form.setFirst(v.replace(/\d/g, "")); form.clearFieldError("first"); }}
                    placeholder="First Name"
                    align="center"
                    weight="600"
                    height={14}
                    className={`w-full ${pill} flex`}
                    onFocus={() => form.onFocus(`${fieldPrefix}First`)}
                    onBlur={form.onBlur}
                />
                <FieldError msg={form.fieldErrors.first} />
            </div>
            <div ref={form.lastRef} className="flex-1 flex flex-col items-center gap-2">
                <SvgInput
                    value={form.last}
                    onChange={v => { form.setLast(v.replace(/\d/g, "")); form.clearFieldError("last"); }}
                    placeholder="Last Name"
                    weight="600"
                    align="center"
                    height={14}
                    className={`w-full ${pill}`}
                    onFocus={() => form.onFocus(`${fieldPrefix}Last`)}
                    onBlur={form.onBlur}
                />
                <FieldError msg={form.fieldErrors.last} />
            </div>
        </div>
    );
}
