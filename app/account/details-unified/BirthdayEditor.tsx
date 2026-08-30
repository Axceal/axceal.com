"use client";

import { useState, useEffect, useRef } from "react";
import { SvgText } from "@/app/components/text/SvgText";
import { SvgInput } from "@/app/components/text/SvgInput";
import { daysInMonth } from "./helpers";

interface BirthdayEditorProps {
    initialBirthday: string; // YYYY-MM-DD
    onSave: (birthday: string) => void;
}

export function BirthdayEditor({ initialBirthday, onSave }: BirthdayEditorProps) {
    const defaultDate = initialBirthday ? new Date(initialBirthday) : null;

    const [day, setDay] = useState<string>(defaultDate ? String(defaultDate.getUTCDate()).padStart(2, "0") : "");
    const [month, setMonth] = useState<string>(defaultDate ? String(defaultDate.getUTCMonth() + 1).padStart(2, "0") : "");
    const [year, setYear] = useState<string>(defaultDate ? String(defaultDate.getUTCFullYear()) : "");

    const [focusedField, setFocusedField] = useState<"day" | "month" | "year" | null>(null);

    const isBirthdayValid = (() => {
        if (day.length < 1 || month.length < 1 || year.length !== 4) return false;
        const d = parseInt(day);
        const m = parseInt(month) - 1;
        const y = parseInt(year);
        if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
        if (d < 1 || m < 0 || m > 11 || y < 1900) return false;

        const maxDays = daysInMonth(m, y);
        if (d > maxDays) return false;

        const birth = new Date(y, m, d);
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 13);
        return birth <= cutoff;
    })();

    const onSaveRef = useRef(onSave);
    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        if (isBirthdayValid) {
            const yyyy = year;
            const mm = month.padStart(2, "0");
            const dd = day.padStart(2, "0");
            onSaveRef.current(`${yyyy}-${mm}-${dd}`);
        }
    }, [isBirthdayValid, year, month, day]);

    const handleDayChange = (v: string) => {
        let clean = v.replace(/\D/g, '').slice(0, 2);
        if (parseInt(clean) > 31) clean = "31";
        setDay(clean);
        if (clean.length === 2) {
            setTimeout(() => document.getElementById("editor-month-input")?.focus(), 10);
        }
    };

    const handleMonthChange = (v: string) => {
        let clean = v.replace(/\D/g, '').slice(0, 2);
        if (parseInt(clean) > 12) clean = "12";
        setMonth(clean);
        if (clean.length === 2) {
            setTimeout(() => document.getElementById("editor-year-input")?.focus(), 10);
        }
    };

    const handleYearChange = (v: string) => {
        const clean = v.replace(/\D/g, '').slice(0, 4);
        setYear(clean);
    };

    const getFieldColor = (field: "day" | "month" | "year", val: string) => {
        if (val) return "text-[#0000f4]";
        return focusedField === field ? "text-[#aaaaaa]" : "text-[#aaaaaa]";
    };

    return (
        <div className="flex flex-col w-full pt-6 pb-5 items-center relative min-h-[140px]">
            <div className="flex flex-col items-start gap-1 w-full pl-2 mb-6 pr-2">
                <SvgText text="When is your Birthday, so we" weight="600" height={14} className="text-[#aaaaaa]" />
                <div className="flex items-center gap-2">
                    <SvgText text="don't miss it" weight="600" height={14} className="text-[#aaaaaa]" />
                    {!isBirthdayValid && day.length > 0 && month.length > 0 && year.length === 4 && (
                        <SvgText text="Must be 13+" weight="600" height={14} className="text-[#ff0000]" />
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between w-full h-[60px] px-2 max-w-[300px]">
                <div className="flex-1 flex justify-center">
                    <SvgInput
                        id="editor-day-input"
                        value={day}
                        onChange={handleDayChange}
                        onFocus={() => setFocusedField("day")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Day"
                        weight="600"
                        height={20}
                        align="center"
                        inputMode="numeric"
                        cursorHeightScale={1.5}
                        cursorColor="#0000f4"
                        className={`w-full ${getFieldColor("day", day)} bg-transparent`}
                    />
                </div>

                <div className="w-[8px] h-[8px] rounded-full bg-[#aaaaaa] shrink-0" />

                <div className="flex-1 flex justify-center">
                    <SvgInput
                        id="editor-month-input"
                        value={month}
                        onChange={handleMonthChange}
                        onFocus={() => setFocusedField("month")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Month"
                        weight="600"
                        height={20}
                        align="center"
                        inputMode="numeric"
                        cursorHeightScale={1.5}
                        cursorColor="#0000f4"
                        className={`w-full ${getFieldColor("month", month)} bg-transparent`}
                    />
                </div>

                <div className="w-[8px] h-[8px] rounded-full bg-[#aaaaaa] shrink-0" />

                <div className="flex-1 flex justify-center">
                    <SvgInput
                        id="editor-year-input"
                        value={year}
                        onChange={handleYearChange}
                        onFocus={() => setFocusedField("year")}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Year"
                        weight="600"
                        height={20}
                        align="center"
                        inputMode="numeric"
                        cursorHeightScale={1.5}
                        cursorColor="#0000f4"
                        className={`w-full ${getFieldColor("year", year)} bg-transparent`}
                    />
                </div>
            </div>
        </div>
    );
}
