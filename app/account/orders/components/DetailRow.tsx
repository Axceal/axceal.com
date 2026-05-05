import { SvgText } from "../../../components/SvgText";

export type DetailRowProps =
    | { label: string; value: string; valueLines?: never }
    | { label: string; value?: never; valueLines: string[] };

export function DetailRow({ label, value, valueLines }: DetailRowProps) {
    return (
        <div className="flex items-start gap-6">
            <div className="w-[160px] flex justify-end shrink-0">
                <SvgText text={label} weight="600" height={14} className="text-[#1e1e1e] text-right" />
            </div>
            <div className="flex-1">
                {valueLines ? (
                    <div className="flex flex-col gap-1">
                        {valueLines.map((line, i) => (
                            <SvgText key={i} text={line} weight="500" height={13} className="text-[#aaaaaa]" />
                        ))}
                    </div>
                ) : (
                    <SvgText text={value || "—"} weight="500" height={13} className="text-[#aaaaaa]" />
                )}
            </div>
        </div>
    );
}
