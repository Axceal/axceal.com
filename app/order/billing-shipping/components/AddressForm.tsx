"use client";
import { SvgText } from "../../../components/text/SvgText";
import type { AddressFormState } from "../hooks/useBillingShippingForm";
import { NameRow } from "./NameRow";
import { AddressRow } from "./AddressRow";
import { CountryStateRow } from "./CountryStateRow";
import { ZipRow } from "./ZipRow";
import { PhoneRow } from "./PhoneRow";

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
            {/* Blue sliding indicator — top/left tracks active input's offset */}
            <div
                className={`absolute w-[40px] h-[2.5px] rounded-full pointer-events-none transition-[top,left,opacity,background-color] duration-200 ease-in-out ${indicatorColor}`}
                style={{
                    top: form.pos ? `${form.pos.top}px` : undefined,
                    left: form.pos ? `${form.pos.left}px` : undefined,
                    opacity: form.pos ? 1 : 0,
                }}
            />

            <div className="flex flex-col items-center gap-1.5 mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-[8px] h-[8px] bg-[#aaaaaa] rounded-full shrink-0" aria-hidden />
                    <SvgText text={title} weight="600" height={18} className="text-[#1e1e1e]" />
                </div>
            </div>

            <NameRow form={form} nameLabel={nameLabel} fieldPrefix={fieldPrefix} />
            <AddressRow form={form} fieldPrefix={fieldPrefix} />
            <CountryStateRow
                form={form}
                fieldPrefix={fieldPrefix}
                correctedFields={correctedFields}
                setCorrectedFields={setCorrectedFields}
            />
            <ZipRow
                form={form}
                fieldPrefix={fieldPrefix}
                correctedFields={correctedFields}
                setCorrectedFields={setCorrectedFields}
            />
            <PhoneRow form={form} fieldPrefix={fieldPrefix} />

            {footer}
        </div>
    );
}
