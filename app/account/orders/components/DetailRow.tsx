import { SvgText } from "../../../components/text/SvgText";

export type DetailRowProps =
    | { label: string; value: string; valueLines?: never }
    | { label: string; value?: never; valueLines: string[] };

export function DetailRow({ label, value, valueLines }: DetailRowProps) {
    const PLACEHOLDER_HEIGHT = 14;
    return (
        <div className="flex items-center gap-[15px] md:gap-6">
            <div className={`w-[75px] md:w-[120px] flex justify-end shrink-0 ${valueLines ? "self-start" : ""}`}>
                <SvgText
                    text={label}
                    weight="600"
                    height={14}
                    className="text-[#aaaaaa] text-right"
                    align="right"
                />
            </div>
            <div className="flex-1 min-w-0">
                {valueLines ? (
                    <div className="flex flex-col items-start gap-1 min-h-[14px]">
                        {valueLines.map((line, i) =>
                            line ? (
                                <SvgText
                                    key={i}
                                    text={line}
                                    weight="600"
                                    height={PLACEHOLDER_HEIGHT}
                                    className="text-[#1e1e1e]"
                                />
                            ) : (
                                <span
                                    key={i}
                                    style={{ height: PLACEHOLDER_HEIGHT }}
                                    aria-hidden
                                />
                            ),
                        )}
                    </div>
                ) : value ? (
                    <SvgText
                        text={value}
                        weight="600"
                        height={PLACEHOLDER_HEIGHT}
                        className="text-[#1e1e1e]"
                    />
                ) : (
                    <span
                        style={{ height: PLACEHOLDER_HEIGHT }}
                        aria-hidden
                    />
                )}
            </div>
        </div>
    );
}
