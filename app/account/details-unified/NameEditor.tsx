"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SvgText } from "@/app/components/text/SvgText";
import { SvgInput } from "@/app/components/text/SvgInput";

interface NameEditorProps {
    initialFirst: string;
    initialLast: string;
    onSave: (first: string, last: string) => Promise<void>;
}

export function NameEditor({ initialFirst, initialLast, onSave }: NameEditorProps) {
    const [firstName, setFirstName] = useState(initialFirst);
    const [lastName, setLastName] = useState(initialLast);
    const [activeField, setActiveField] = useState<"first" | "last" | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleFocus = (field: "first" | "last") => {
        setActiveField(field);
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(firstName, lastName);
        setIsSaving(false);
    };

    return (
        <div className="flex flex-col w-full h-[50px] justify-center px-2">
            <div className="flex w-full gap-3">
                <div className="flex-1 relative flex items-center justify-center">
                    {activeField === "first" && isFocused && (
                        <motion.div
                            layoutId="details-name-inline-indicator"
                            className="absolute -top-[2.5px] left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none z-10 bg-[#0000f4]"
                            transition={{ type: "spring", stiffness: 280, damping: 28 }}
                        />
                    )}
                    <SvgInput
                        placeholder="First Name"
                        value={firstName}
                        onChange={v => { const c = v.replace(/[^A-Za-z\-']/g, "").slice(0, 18); setFirstName(c.charAt(0).toUpperCase() + c.slice(1)); onSave(c.charAt(0).toUpperCase() + c.slice(1), lastName); }}
                        onFocus={() => handleFocus("first")}
                        onBlur={handleBlur}
                        align="center"
                        weight="500"
                        height={20}
                        placeholderOpacity={1}
                        placeholderColor="#aaaaaa"
                        className="w-full text-[#1e1e1e] bg-transparent"
                    />
                </div>
                <div className="flex-1 relative flex items-center justify-center">
                    {activeField === "last" && isFocused && (
                        <motion.div
                            layoutId="details-name-inline-indicator"
                            className="absolute -top-[2.5px] left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none z-10 bg-[#0000f4]"
                            transition={{ type: "spring", stiffness: 280, damping: 28 }}
                        />
                    )}
                    <SvgInput
                        placeholder="Last Name"
                        value={lastName}
                        align="center"
                        onChange={v => { const c = v.replace(/[^A-Za-z\-']/g, "").slice(0, 18); setLastName(c.charAt(0).toUpperCase() + c.slice(1)); onSave(firstName, c.charAt(0).toUpperCase() + c.slice(1)); }}
                        onFocus={() => handleFocus("last")}
                        onBlur={handleBlur}
                        weight="500"
                        height={20}
                        placeholderOpacity={1}
                        placeholderColor="#aaaaaa"
                        className="w-full text-[#1e1e1e]"
                    />
                </div>
            </div>
        </div>
    );
}
