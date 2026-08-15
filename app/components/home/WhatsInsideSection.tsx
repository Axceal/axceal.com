"use client";
import { motion } from "framer-motion";
import { SPRING } from "./constants";
import { SvgText } from "../text/SvgText";
import { Squircle } from "../layout/Squircle";

interface Props {
  section: number;
}

// Desktop S2 panel: "What's inside the box".
// Slides in from below when section === 2, exits upward when leaving to a hypothetical S3.
// Center content area left empty — box item assets to be added later.
export function WhatsInsideSection({ section }: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 flex flex-row items-center justify-center gap-4"
        initial={{ y: "100vh", opacity: 0 }}
        animate={{
          y: section === 2 ? "0vh" : section < 2 ? "100vh" : "-100vh",
          opacity: section === 2 ? 1 : 0,
        }}
        transition={SPRING}
      >
        <Squircle borderRadius={20} className="w-[200px] h-[200px] bg-[#f1f1f1] flex items-center justify-center">
          <SvgText text="Aero x1" weight="600" height={16} className="text-[#1e1e1e]" />
        </Squircle>
        <Squircle borderRadius={20} className="w-[300px] h-[200px] bg-[#f1f1f1] flex items-center justify-center">
          <SvgText text="Dock-C Cable" weight="600" height={16} className="text-[#1e1e1e]" />
        </Squircle>
      </motion.div>
    </div>
  );
}
