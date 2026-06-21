import { SvgText } from "../text/SvgText";

interface PasswordConstraintsProps {
    isLengthValid: boolean;
    hasSpecialChar: boolean;
    hasUpper: boolean;
    hasDigit: boolean;
    passwordLength: number;
}

export function PasswordConstraints({ hasSpecialChar, hasUpper, hasDigit, passwordLength }: PasswordConstraintsProps) {
    const circles = Array.from({ length: 8 });
    const isFullLength = passwordLength >= 8;

    return (
        <div className="flex flex-col items-center gap-4 py-4 w-full">
            {/* Circles */}
            <div className="flex items-center gap-[8px]">
                {circles.map((_, i) => {
                    const isFilled = i < passwordLength;
                    const strokeColor = isFullLength ? "#0000f4" : "#aaaaaa";
                    const fillColor = isFullLength ? "#0000f4" : (isFilled ? "#aaaaaa" : "transparent");

                    return (
                        <div
                            key={i}
                            className="w-[18px] h-[18px] rounded-full transition-colors duration-200"
                            style={{
                                border: `1.5px solid ${strokeColor}`,
                                backgroundColor: fillColor,
                            }}
                        />
                    );
                })}
            </div>

            {/* Constraints Text */}
            <div className="flex flex-row items-center gap-2">
                <SvgText text="Must have" weight="500" height={14} className="text-[#aaaaaa]" />
                <SvgText text="(A-Z)" weight="500" height={14} className={hasUpper ? "text-[#0000f4]" : "text-[#ff0000]"} />
                <SvgText text="(0-9)" weight="500" height={14} className={hasDigit ? "text-[#0000f4]" : "text-[#ff0000]"} />
                <SvgText text="(!,@,#,$,&)" weight="500" height={14} className={hasSpecialChar ? "text-[#0000f4]" : "text-[#ff0000]"} />
            </div>
        </div>
    );
}
