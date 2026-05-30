/* eslint-disable react-hooks/refs */
import { SvgText } from "../../../components/text/SvgText";
import { SvgInput } from "../../../components/text/SvgInput";
import type { AddressFormState } from "../hooks/useBillingShippingForm";
import { FieldError } from "./FieldError";
import { pill } from "./addressFormStyles";

export function AddressRow({
    form,
    fieldPrefix,
}: {
    form: AddressFormState;
    fieldPrefix: "b" | "s";
}) {
    return (
        <div className="w-full flex flex-col gap-2">
            <div ref={form.addressRef} className="w-full">
                <SvgInput
                    value={form.address}
                    onChange={(v) => {
                        if (v.length <= 50) { form.setAddress(v); form.clearFieldError("address"); }
                    }}
                    placeholder="Home Address"
                    weight="600"
                    height={14}
                    className={`w-full ${pill} px-8`}
                    onFocus={() => form.onFocus(`${fieldPrefix}Address`)}
                    onBlur={form.onBlur}
                    rightSlot={
                        <SvgText
                            text="50 characters"
                            weight="600"
                            height={14}
                            maxWidth={Infinity}
                            className="text-[#aaaaaa] pr-2 shrink-0"
                        />
                    }
                />
            </div>
            <FieldError msg={form.fieldErrors.address} />
        </div>
    );
}
