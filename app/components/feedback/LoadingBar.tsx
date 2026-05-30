"use client";

import { motion } from "framer-motion";

interface LoadingBarProps {
    className?: string;
    trackClassName?: string;
    fillClassName?: string;
}

export function LoadingBar({
    className = "w-[150px]",
    trackClassName = "bg-[#f1f1f1]",
    fillClassName = "bg-[#0000f4]",
}: LoadingBarProps) {
    return (
        <div className={`h-[5px] rounded-full overflow-hidden ${trackClassName} ${className}`}>
            <motion.div
                className={`h-full rounded-full ${fillClassName}`}
                style={{ width: "30%" }}
                animate={{ x: ["-100%", "333%"] }}
                transition={{
                    repeat: Infinity,
                    ease: "easeInOut",
                    duration: 1.5,
                    delay: -0.75,
                }}
            />
        </div>
    );
}
