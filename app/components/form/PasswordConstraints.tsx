import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../text/SvgText";

interface PasswordConstraintsProps {
    isLengthValid: boolean;
    hasSpecialChar: boolean;
    hasUpper: boolean;
    hasDigit: boolean;
}

export function PasswordConstraints({ isLengthValid, hasSpecialChar, hasUpper, hasDigit }: PasswordConstraintsProps) {
    return (
        <AnimatePresence initial={false}>
            {!isLengthValid && (
                <motion.div key="c-len" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                    <div className="flex justify-center py-2">
                        <SvgText text="Must be of 8 to 64 characters long" weight="500" height={14} maxWidth={Infinity} className="text-[#aaaaaa]" />
                    </div>
                </motion.div>
            )}
            {!hasSpecialChar && (
                <motion.div key="c-spec" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                    <div className="flex justify-center py-2">
                        <SvgText text="Include a special character (!,@,#,$,&)" weight="500" height={14} maxWidth={Infinity} className="text-[#aaaaaa]" />
                    </div>
                </motion.div>
            )}
            {!hasUpper && (
                <motion.div key="c-up" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                    <div className="flex justify-center py-2">
                        <SvgText text="One or more uppercase letters (A-Z)" weight="500" height={14} maxWidth={Infinity} className="text-[#aaaaaa]" />
                    </div>
                </motion.div>
            )}
            {!hasDigit && (
                <motion.div key="c-num" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                    <div className="flex justify-center py-2">
                        <SvgText text="One or more numeric digits(0-9)" weight="500" height={14} maxWidth={Infinity} className="text-[#aaaaaa]" />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
