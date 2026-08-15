"use client";
import { motion } from "framer-motion";
import { AxcealLogo } from "../icons/brand/AxcealLogo";
import { SvgText } from "../text/SvgText";

interface Props {
  section: number;
}

// Desktop footer — slides up from below when S2 is active, hidden for S0/S1.
// Contains Axceal branding + copyright on the left, contact info on the right.
export function HomeFooter({ section }: Props) {
  return (
    <motion.div
      className="absolute bottom-0 left-[clamp(1.5rem,8vw,7.5rem)] right-[clamp(1.5rem,8vw,7.5rem)] bg-[#f1f1f1] rounded-t-[20px] py-6 px-8 flex flex-row items-center justify-between z-20"
      initial={{ y: "100%" }}
      animate={{ y: section === 2 ? "0%" : "100%" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Left: logo + brand name + copyright */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center gap-2">
          <AxcealLogo className="h-3 w-auto text-[#aaaaaa]" />
          <SvgText text="Axceal" weight="600" height={12} className="text-[#aaaaaa]" />
        </div>
        <SvgText text="All intellectual property belongs to Aectex Technologies Pvt. Ltd." weight="500" height={12} maxWidth={Infinity} className="text-[#aaaaaa]" />
      </div>

      {/* Right: contact label + details */}
      <div className="flex flex-col items-end gap-2">
        <SvgText text="Contact" weight="500" height={12} className="text-[#aaaaaa]" />
        <SvgText text="contact@axceal.com | +91 88302-61513" weight="500" height={12} maxWidth={Infinity} className="text-[#aaaaaa]" />
      </div>
    </motion.div>
  );
}
