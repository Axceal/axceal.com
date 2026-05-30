"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { SvgText } from "../../../components/text/SvgText";
import { SvgInput } from "../../../components/text/SvgInput";
import { useAccountDetails } from "../context";

export default function NamePage() {
    const { firstName, setFirstName, lastName, setLastName } = useAccountDetails();
    const [activeField, setActiveField] = useState<"first" | "last" | null>(null);
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (field: "first" | "last") => {
        setActiveField(field);
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    return (
        <div className="w-[360px] flex flex-col justify-center gap-5">
            <SvgText text="What's your name" weight="600" height={16} className="text-[#aaaaaa] mt-[15px]" />
            <div className="flex w-full gap-3">
                <div className="flex-1 relative">
                    {activeField === "first" && isFocused && (
                        <motion.div
                            layoutId="details-name-indicator"
                            className="absolute -top-[2.5px] left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none z-10 bg-[#0000f4]"
                            transition={{ type: "spring", stiffness: 280, damping: 28 }}
                        />
                    )}
                    <SvgInput
                        placeholder="First Name"
                        value={firstName}
                        onChange={v => { const c = v.replace(/[^A-Za-z\-']/g, "").slice(0, 18); setFirstName(c.charAt(0).toUpperCase() + c.slice(1)); }}
                        onFocus={() => handleFocus("first")}
                        onBlur={handleBlur}
                        align="center"
                        weight="600"
                        height={16}
                        className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full py-5"
                    />
                </div>
                <div className="flex-1 relative">
                    {activeField === "last" && isFocused && (
                        <motion.div
                            layoutId="details-name-indicator"
                            className="absolute -top-[2.5px] left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none z-10 bg-[#0000f4]"
                            transition={{ type: "spring", stiffness: 280, damping: 28 }}
                        />
                    )}
                    <SvgInput
                        placeholder="Last Name"
                        value={lastName}
                        align="center"
                        onChange={v => { const c = v.replace(/[^A-Za-z\-']/g, "").slice(0, 18); setLastName(c.charAt(0).toUpperCase() + c.slice(1)); }}
                        onFocus={() => handleFocus("last")}
                        onBlur={handleBlur}
                        weight="600"
                        height={16}
                        className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full py-5"
                    />
                </div>
            </div>
        </div>
    );
}
