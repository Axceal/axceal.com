"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SvgText } from "@/app/components/text/SvgText";
import { Squircle } from "@/app/components/layout/Squircle";

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

interface GenderEditorProps {
    initialGender: string;
    onSave: (gender: string) => Promise<void>;
}

export function GenderEditor({ initialGender, onSave }: GenderEditorProps) {
    const [gender, setGender] = useState(initialGender);

    const handleSave = (g: string) => {
        setGender(g);
        onSave(g);
    };

    return (
        <div className="relative flex flex-col w-full py-6 items-center min-h-[140px]">
            {/* Left aligned descriptive text */}
            <div className="absolute left-2 top-6 flex flex-col items-start gap-1 pointer-events-none">
                <SvgText text="Select your" weight="600" height={14} className="text-[#aaaaaa]" maxWidth={300} />
                <SvgText text="gender" weight="600" height={14} className="text-[#aaaaaa]" />
            </div>

            {/* Centered options */}
            <div className="flex flex-col gap-6 items-center w-full">
                {["Female", "Male", "Keep it Private"].map(g => {
                    const active = gender === g;
                    return (
                        <button
                            key={g}
                            onClick={() => handleSave(g)}
                            className="cursor-pointer flex items-center justify-center bg-transparent border-none outline-none"
                        >
                            <motion.div
                                animate={{ color: active ? "#0000f4" : "#1e1e1e" }}
                                transition={SPRING}
                                className="flex items-center justify-center text-center"
                            >
                                <SvgText text={g} weight="600" height={18} maxWidth={160} />
                            </motion.div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
