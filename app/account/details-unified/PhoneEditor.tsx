import { useState, useEffect, useRef } from "react";
import { SvgText } from "@/app/components/text/SvgText";
import { SvgInput } from "@/app/components/text/SvgInput";

interface PhoneEditorProps {
    initialPhone: string | null;
    onSave: (phone: string) => void;
}

const COUNTRY_MAX_DIGITS: Record<string, number> = {
    "+91": 10,  // India
    "+1": 10,   // US/Canada
    "+44": 10,  // UK
    "+61": 9,   // Australia
    "+81": 10,  // Japan
    "+86": 11,  // China
    "+33": 9,   // France
    "+49": 10,  // Germany
    "+39": 10,  // Italy
    "+55": 11,  // Brazil
    "+7": 10,   // Russia
    "+34": 9,   // Spain
    "+52": 10,  // Mexico
    "+31": 9,   // Netherlands
    "+46": 9,   // Sweden
    "+41": 9,   // Switzerland
};

export function PhoneEditor({ initialPhone, onSave }: PhoneEditorProps) {
    const [countryCode, setCountryCode] = useState("");
    const [ccFocused, setCcFocused] = useState(false);

    // Dynamically sized array, minimum 10
    const [phone, setPhone] = useState<string[]>(Array(10).fill(""));
    const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

    const onSaveRef = useRef(onSave);
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        // "clicking on phone field will first trigger input for country code"
        setTimeout(() => document.getElementById("editor-cc-input")?.focus(), 50);
    }, []);

    const handleCcChange = (val: string) => {
        // Allow digits, +, - (max 4 chars)
        const clean = val.replace(/[^\d+\-]/g, "").slice(0, 4);

        setCountryCode(clean);

        // Dynamically adjust phone digits cap based on CC
        const maxDigits = COUNTRY_MAX_DIGITS[clean] || 15;
        let lastFilled = -1;
        for (let j = 0; j < phone.length; j++) {
            if (phone[j]) lastFilled = j;
        }
        const needed = Math.min(maxDigits, Math.max(10, lastFilled + 2));
        const nextArr = [];
        for (let j = 0; j < needed; j++) {
            nextArr.push(phone[j] || "");
        }
        setPhone(nextArr);

        onSaveRef.current(`${clean}${nextArr.join("")}`);
    };

    const handleCcKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowRight") {
            setTimeout(() => document.getElementById('editor-phone-digit-0')?.focus(), 10);
        }
    };

    const handlePhoneChange = (i: number, val: string) => {
        const v = val.replace(/\D/g, "").slice(-1);

        let updated = [...phone];
        updated[i] = v;

        const currentCleanCC = countryCode.replace(/\s/g, "");
        const maxDigits = COUNTRY_MAX_DIGITS[currentCleanCC] || 15;

        // Dynamically adjust number of circles based on size & max limit
        let lastFilled = -1;
        for (let j = 0; j < updated.length; j++) {
            if (updated[j]) lastFilled = j;
        }
        const needed = Math.min(maxDigits, Math.max(10, lastFilled + 2));

        const nextArr = [];
        for (let j = 0; j < needed; j++) {
            nextArr.push(updated[j] || "");
        }

        setPhone(nextArr);
        onSaveRef.current(`${currentCleanCC}${nextArr.join("")}`);

        if (v && i < nextArr.length - 1) {
            setTimeout(() => document.getElementById(`editor-phone-digit-${i + 1}`)?.focus(), 10);
        }
    };

    const handlePhoneKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !phone[i]) {
            if (i > 0) {
                setTimeout(() => document.getElementById(`editor-phone-digit-${i - 1}`)?.focus(), 10);
            } else {
                setTimeout(() => document.getElementById('editor-cc-input')?.focus(), 10);
            }
        }
    };

    return (
        <div className="h-[60px] flex items-center justify-center w-full px-2">
            <div className="flex items-center gap-[10px]">

                {/* Country Code (Right-aligned typing) */}
                <div className="relative flex items-center justify-end min-w-[50px] h-[40px]">
                    <SvgInput
                        id="editor-cc-input"
                        value={countryCode}
                        placeholder=""
                        onChange={handleCcChange}
                        onKeyDown={handleCcKeyDown}
                        onFocus={() => setCcFocused(true)}
                        onBlur={() => setCcFocused(false)}
                        align="right"
                        height={20}
                        weight="600"
                        letterSpacing={4}
                        cursorHeightScale={1.5}
                        cursorColor="#0000f4"
                        className="w-fit min-w-[50px] max-w-[100px] h-full text-[#1e1e1e] bg-transparent relative z-10"
                    />
                </div>

                {/* Digits with background circles */}
                <div className="flex items-center gap-[4px]">
                    {phone.map((digit, i) => (
                        <div key={`phone-${i}`} className="relative flex items-center justify-center w-[16px] h-[40px] shrink-0">
                            {/* Background light circle disappears if filled or if indicator is reached */}
                            {!digit && focusedIdx !== i && (
                                <div className="absolute w-[8px] h-[8px] rounded-full bg-[#aaaaaa] pointer-events-none" />
                            )}

                            <SvgInput
                                id={`editor-phone-digit-${i}`}
                                value={digit}
                                placeholder=""
                                onChange={val => handlePhoneChange(i, val)}
                                onKeyDown={e => handlePhoneKeyDown(i, e)}
                                onFocus={() => setFocusedIdx(i)}
                                onBlur={() => setFocusedIdx(current => current === i ? null : current)}
                                height={20}
                                weight="600"
                                align="center"
                                cursorHeightScale={1.5}
                                cursorColor="#0000f4"
                                className="w-full text-[#1e1e1e] bg-transparent relative z-10"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
