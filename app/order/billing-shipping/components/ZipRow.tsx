/* eslint-disable react-hooks/refs */
import { SvgText } from "../../../components/text/SvgText";
import { SvgInput } from "../../../components/text/SvgInput";
import type { AddressFormState } from "../hooks/useBillingShippingForm";
import { pill, corrPill } from "./addressFormStyles";

export function ZipRow({
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
    const zipKey = `${fieldPrefix}Zip`;

    return (
        <div className="w-full flex flex-col gap-2">
            <div ref={form.zipRef} className="w-full">
                <SvgInput
                    value={form.zip}
                    onChange={v => {
                        form.setZip(v.replace(/[a-zA-Z]/g, "").slice(0, 10)); // max 10 length
                        setCorrectedFields(f => { const n = new Set(f); n.delete(zipKey); return n; });
                        form.setZipError(null);
                        form.clearFieldError("zip");
                    }}
                    placeholder="zipcode/pincode"
                    letterSpacing={8} // 8px visual spacing between digits
                    weight="600"
                    height={14}
                    align="center"
                    className={`w-full ${correctedFields.has(zipKey) ? corrPill : pill}`}
                    onFocus={() => form.onFocus(`${fieldPrefix}Zip`)}
                    onBlur={form.onBlur}
                />
            </div>
            {(form.zipError || form.fieldErrors.zip) && (
                <div className="w-full flex justify-center">
                    <SvgText
                        text={form.zipError ?? form.fieldErrors.zip ?? ""}
                        weight="600"
                        height={12}
                        className="text-[#ff0000] mt-1"
                    />
                </div>
            )}
        </div>
    );
}
