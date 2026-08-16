"use client";
import { motion, AnimatePresence } from "framer-motion";
import { SvgInput } from "../text/SvgInput";
import { PasswordToggle } from "./PasswordToggle";

interface AnimatedPasswordFieldProps {
    show: boolean;
    id: string;
    placeholder: string;
    value: string;
    onChange: (val: string) => void;
    shown: boolean;
    onToggle: () => void;
    activeField: string;
    fieldName: string;
    onFocus: () => void;
    onBlur: () => void;
    layoutId: string;
    message: { kind: "info" | "error"; text: string; field?: string | null } | null;
    // Hide indicator unless user actively has a field focused. Defaults true
    // for backward compat with callers that don't track focus state.
    isFocused?: boolean;
    height?: number;
}

export function AnimatedPasswordField({
    show,
    id,
    placeholder,
    value,
    onChange,
    shown,
    onToggle,
    activeField,
    fieldName,
    onFocus,
    onBlur,
    layoutId,
    message,
    isFocused = true,
    height = 18,
}: AnimatedPasswordFieldProps) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full overflow-hidden pt-1"
                >
                    <div className="w-full relative">
                        {activeField === fieldName && isFocused && (
                            <motion.div
                                layoutId={layoutId}
                                className={`absolute -top-[2.5px] left-1/2 -translate-x-1/2 w-[40px] h-[2.5px] rounded-full pointer-events-none z-10 ${message?.kind === "error" ? "bg-[#ff0000]" : "bg-[#0000f4]"}`}
                                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                            />
                        )}
                        <SvgInput
                            id={id}
                            type={shown ? "text" : "password"}
                            placeholder={placeholder}
                            value={value}
                            onChange={onChange}
                            weight="600"
                            height={height}
                            align="center"
                            className="w-full bg-[#f1f1f1] text-[#1e1e1e] rounded-full pl-8 pr-1 py-1 transition-all"
                            onFocus={onFocus}
                            onBlur={onBlur}
                            rightSlot={
                                <PasswordToggle shown={shown} onToggle={onToggle} />
                            }
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
