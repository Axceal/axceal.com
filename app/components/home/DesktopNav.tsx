"use client";
import { motion } from "framer-motion";
import { SvgText } from "../text/SvgText";
import { SPRING, NavState } from "./constants";

interface Props {
  nav: NavState;
  goSection: (n: number) => void;
  goSubSlide: (n: number) => void;
}

// Left-side section navigation labels (desktop only).
// Each label animates to a different top/y/opacity based on which section is active.
// Clicking a label jumps directly to that section; clicking S1 also resets subSlide to 0.
export function DesktopNav({ nav, goSection, goSubSlide }: Props) {
  return (
    <div className="absolute inset-y-0 left-[clamp(1.5rem,8vw,7.5rem)] z-10">
      <motion.div
        className="absolute cursor-pointer"
        onClick={() => goSection(0)}
        initial={{ top: "40%", y: "-12px", opacity: 1 }}
        animate={nav.aero}
        transition={SPRING}
      >
        <SvgText text="Aero" weight="700" className="text-[#1e1e1e]" height={30} maxWidth={80} />
      </motion.div>

      <motion.div
        className="absolute cursor-pointer"
        onClick={() => { goSection(1); goSubSlide(0); }}
        initial={{ top: "70%", y: "27px", opacity: 0.4 }}
        animate={nav.whatcan}
        transition={SPRING}
      >
        <SvgText text={"What can Aero \ndo"} weight="700" className="text-[#1e1e1e]" height={28} />
      </motion.div>

      <motion.div
        className="absolute cursor-pointer"
        onClick={() => goSection(2)}
        initial={{ top: "90%", y: "20px", opacity: 0.4 }}
        animate={nav.whatsinside}
        transition={SPRING}
      >
        <SvgText text={"What's inside the \nbox"} weight="700" className="text-[#1e1e1e]" height={28} />
      </motion.div>
    </div>
  );
}
