import { useState, useEffect, useRef } from "react";
import { SvgText } from "@/app/components/text/SvgText";
import { SvgInput } from "@/app/components/text/SvgInput";

interface PhoneEditorProps {
    initialPhone: string | null;
    initialFocus?: "cc" | "phone";
    onSave: (phone: string) => void;
    error?: boolean;
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

export function PhoneEditor({ initialPhone, initialFocus = "cc", onSave, error }: PhoneEditorProps) {
    const [sign, setSign] = useState<"+" | "-">("+");
    const [countryCode, setCountryCode] = useState("");
    const [ccFocused, setCcFocused] = useState(false);

    const [phone, setPhone] = useState<string[]>(Array(10).fill(""));
    const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialPhone && !initialized.current) {
            initialized.current = true;
            let parsedStr = initialPhone;
            let cc = "";
            let pStr = "";
            
            // Extract explicitly saved segments separated by a space
            if (parsedStr.includes(" ")) {
                const spaceIdx = parsedStr.indexOf(" ");
                cc = parsedStr.slice(0, spaceIdx);
                pStr = parsedStr.slice(spaceIdx + 1); // contains spaces for empty slots
            } else {
                // Try to match known country codes first
                const sortedCCs = Object.keys(COUNTRY_MAX_DIGITS).sort((a, b) => b.length - a.length);
                for (const code of sortedCCs) {
                    if (parsedStr.startsWith(code)) {
                        cc = code;
                        pStr = parsedStr.slice(code.length);
                        break;
                    }
                }

                if (!cc) {
                    const m = parsedStr.match(/^(\+\d{1,3})(\d+)$/);
                    if (m) {
                        cc = m[1];
                        pStr = m[2];
                    } else if (parsedStr.startsWith("+")) {
                        cc = parsedStr;
                    } else {
                        pStr = parsedStr;
                    }
                }
            }
            let foundSign: "+" | "-" = "+";
            let foundCc = cc;
            if (cc.startsWith("-")) {
                foundSign = "-";
                foundCc = cc.slice(1);
            } else if (cc.startsWith("+")) {
                foundSign = "+";
                foundCc = cc.slice(1);
            }
            
            setSign(foundSign);
            setCountryCode(foundCc);
            
            const digits = pStr.split("");
            const nextArr = Array(Math.max(10, digits.length)).fill("");
            for (let i = 0; i < digits.length; i++) {
                nextArr[i] = digits[i] === " " ? "" : digits[i];
            }
            setPhone(nextArr);
        }
    }, [initialPhone]);

    const onSaveRef = useRef(onSave);
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        if (initialFocus === "phone") {
            setTimeout(() => document.getElementById("editor-phone-digit-0")?.focus(), 50);
        } else {
            setTimeout(() => document.getElementById("editor-cc-input")?.focus(), 50);
        }
    }, [initialFocus]);

    const handleSignChange = (newSign: "+" | "-") => {
        setSign(newSign);
        const phoneStr = phone.map(d => d || " ").join("");
        onSaveRef.current(`${newSign}${countryCode} ${phoneStr}`);
    };

    const handleCcChange = (val: string) => {
        let clean = val.replace(/[^\d]/g, "");
        if (clean.length > 4) clean = clean.slice(0, 4);
        setCountryCode(clean);

        // Update phone array with correct length for this CC but don't carry any digits over
        const lookup = sign + clean;
        const maxDigits = COUNTRY_MAX_DIGITS[lookup] || 15;
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

        const phoneStr = nextArr.map(d => d || " ").join("");
        onSaveRef.current(`${sign}${clean} ${phoneStr}`);
    };

    const handleCcKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowRight" && (e.target as HTMLInputElement).selectionStart === countryCode.length) {
            document.getElementById('editor-phone-digit-0')?.focus();
        }
    };

    const handlePhoneChange = (idx: number, val: string) => {
        let clean = val.replace(/[^\d]/g, "");
        
        // Handle backspace or empty
        if (!clean) {
            const nextArr = [...phone];
            nextArr[idx] = "";
            setPhone(nextArr);
            const phoneStr = nextArr.map(d => d || " ").join("");
            onSaveRef.current(`${sign}${countryCode} ${phoneStr}`);
            return;
        }

        // Handle multi-character paste or quick typing
        const chars = clean.split("");
        const nextArr = [...phone];
        let currentCleanCC = countryCode;

        for (let i = 0; i < chars.length; i++) {
            if (idx + i < nextArr.length) {
                nextArr[idx + i] = chars[i];
            }
        }

        setPhone(nextArr);
        const phoneStr = nextArr.map(d => d || " ").join("");
        onSaveRef.current(`${sign}${currentCleanCC} ${phoneStr}`);

        if (val && idx < nextArr.length - 1) {
            setTimeout(() => document.getElementById(`editor-phone-digit-${idx + 1}`)?.focus(), 10);
            setFocusedIdx(idx + 1);
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
        if (e.key === "ArrowLeft" && i === 0 && (e.target as HTMLInputElement).selectionStart === 0) {
            document.getElementById('editor-cc-input')?.focus();
        }
    };

    const ccEmpty = !countryCode;
    const phoneEmpty = phone.every(d => d === "");
    const showPhonePlaceholder = phoneEmpty && focusedIdx === null;
    const showCcPlaceholder = ccEmpty && !ccFocused;

    const activeSignBg = error ? "bg-[#ff0000]" : "bg-[#0000f4]";
    const cursorCol = error ? "#ff0000" : "#0000f4";
    const textCol = error ? "text-[#ff0000]" : "text-[#1e1e1e]";
    const placeholderCol = error ? "text-[#ff0000]" : "text-[#aaaaaa]";
    const dotBg = error ? "bg-[#ff0000]" : "bg-[#aaaaaa]";

    return (
        <div className="py-4 flex flex-col items-center justify-center w-full px-4 gap-3">
            {/* Row 1: Sign Toggles */}
            <div className="flex items-center justify-center gap-2 w-full h-[28px] shrink-0">
                <div 
                    className={`w-[28px] h-[28px] rounded-full flex items-center justify-center cursor-pointer transition-colors ${sign === '+' ? activeSignBg : 'bg-transparent'}`}
                    onClick={() => handleSignChange("+")}
                >
                    <SvgText text="+" weight="600" height={20} className={sign === '+' ? "text-white" : placeholderCol} />
                </div>
                <div 
                    className={`w-[28px] h-[28px] rounded-full flex items-center justify-center cursor-pointer transition-colors ${sign === '-' ? activeSignBg : 'bg-transparent'}`}
                    onClick={() => handleSignChange("-")}
                >
                    <SvgText text="-" weight="600" height={20} className={sign === '-' ? "text-white" : placeholderCol} />
                </div>
            </div>

            {/* Row 2: Country Code */}
            <div className="relative flex items-center justify-center w-full h-[24px] shrink-0">
                {showCcPlaceholder && (
                    <div 
                        className="absolute inset-0 flex items-center justify-center cursor-pointer pointer-events-auto"
                        onClick={() => document.getElementById('editor-cc-input')?.focus()}
                    >
                        <SvgText text="Country code" weight="500" height={14} className={placeholderCol} />
                    </div>
                )}
                
                <div className={`flex items-center justify-center h-full transition-opacity w-full ${showCcPlaceholder ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="relative flex items-center justify-center h-full w-[100px] shrink-0">
                        <SvgInput
                            id="editor-cc-input"
                            value={countryCode}
                            placeholder=""
                            onChange={handleCcChange}
                            onKeyDown={handleCcKeyDown}
                            onFocus={() => setCcFocused(true)}
                            onBlur={() => setCcFocused(false)}
                            align="center"
                            height={20}
                            weight="600"
                            letterSpacing={6}
                            inputMode="numeric"
                            cursorHeightScale={1.5}
                            cursorColor={cursorCol}
                            className={`w-full h-full ${textCol}`}
                        />
                    </div>
                </div>
            </div>

            {/* Phone Digits Row */}
            <div className="relative flex items-center justify-center w-full h-[24px]">
                {showPhonePlaceholder && (
                    <div 
                        className="absolute inset-0 flex items-center justify-center cursor-pointer pointer-events-auto"
                        onClick={() => {
                            document.getElementById('editor-phone-digit-0')?.focus();
                            setFocusedIdx(0);
                            setCcFocused(false);
                        }}
                    >
                        <SvgText text="Phone Number" weight="500" height={20} className={placeholderCol} />
                    </div>
                )}
                <div className={`flex items-center justify-center gap-[4px] h-full ${showPhonePlaceholder ? 'absolute inset-0 opacity-0 pointer-events-none' : 'relative z-10 w-full'}`}>
                    {phone.map((digit, i) => (
                        <div key={`phone-${i}`} className="relative flex items-center justify-center w-[16px] h-full shrink-0">
                            {/* Background light circle disappears if filled or if indicator is reached or if placeholder is showing */}
                            {!digit && focusedIdx !== i && !showPhonePlaceholder && (
                                <div className={`absolute w-[8px] h-[8px] rounded-full pointer-events-none ${dotBg}`} />
                            )}

                            <SvgInput
                                id={`editor-phone-digit-${i}`}
                                value={digit}
                                placeholder=""
                                onChange={val => handlePhoneChange(i, val)}
                                onKeyDown={e => handlePhoneKeyDown(i, e)}
                                onFocus={() => {
                                    if (phoneEmpty && i !== 0) {
                                        document.getElementById("editor-phone-digit-0")?.focus();
                                    } else {
                                        setFocusedIdx(i);
                                        setCcFocused(false);
                                    }
                                }}
                                onBlur={() => setFocusedIdx(current => current === i ? null : current)}
                                height={20}
                                weight="600"
                                align="center"
                                inputMode="numeric"
                                cursorHeightScale={1.5}
                                cursorColor={cursorCol}
                                className={`w-full h-full relative z-10 ${textCol}`}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
