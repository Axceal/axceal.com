"use client";
import { motion } from "framer-motion";
import { SPRING } from "./constants";

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
        className="absolute inset-0"
        initial={{ y: "100vh", opacity: 0 }}
        animate={{
          y: section === 2 ? "0vh" : section < 2 ? "100vh" : "-100vh",
          opacity: section === 2 ? 1 : 0,
        }}
        transition={SPRING}
      >
        {/* Box contents — to be added */}
      </motion.div>
    </div>
  );
}
