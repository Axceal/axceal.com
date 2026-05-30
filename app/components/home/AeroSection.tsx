"use client";
import { motion } from "framer-motion";
import { AxcealLogo } from "../icons/brand/AxcealLogo";
import { AeroIcon } from "../icons/brand/AeroIcon";
import { SvgText } from "../text/SvgText";
import { SPRING } from "./constants";

interface Props {
  // Active section index — this panel is visible only when section === 0
  section: number;
}

// Desktop S0 panel: Aero device image centered on screen + hero taglines on the right.
// Slides out upward (y: -100vh) when the user scrolls to S1 and stays hidden for S2.
export function AeroSection({ section }: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 flex flex-col md:block"
        animate={{
          y: section === 0 ? "0vh" : "-100vh",
          opacity: section === 0 ? 1 : 0,
        }}
        transition={SPRING}
      >
        {/* Aero device image — pinned to true page center */}
        <div className="absolute md:left-1/2 lg:left-[47%] md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex justify-center transition-all duration-500">
          <div className="relative w-[clamp(250px,50vw,350px)] lg:w-[450px] transition-all duration-500">
            <AeroIcon alt="Aero x1" className="w-full h-auto" priority />
            {/* Product label overlaid on the device image */}
            <div className="absolute left-[57%] top-[50%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
              <AxcealLogo className="h-[clamp(12px,3vw,16px)] w-auto text-[#0000f4]" />
              {/* §7 — maxWidth={Infinity} skips the useParentWidth measure
                  phase, so server-rendered glyph paths are final on first
                  paint. Removes the measure → reflow → CLS cycle for hero
                  labels that never need to soft-wrap. */}
              <SvgText as="h1" text="Aero x1" weight="600" maxWidth={Infinity} className="text-[#0000f4]" height={20} />
            </div>
          </div>
        </div>

        {/* Hero taglines — right side, large screens only */}
        <div className="hidden lg:flex absolute md:right-[clamp(2rem,15vw,17.5rem)] md:top-1/2 md:-translate-y-1/2 flex-col gap-[clamp(2rem,10vh,5rem)] items-end text-left">
          <SvgText align="right" text={"Be unconstrained in\nall you\ndo"} weight="700" maxWidth={Infinity} className="text-[#0000f4]" height={24} />
          <SvgText align="right" text={"Do\nmore,\nbe frictionless"} weight="700" maxWidth={Infinity} className="text-[#0000f4]" height={24} />
        </div>
      </motion.div>
    </div>
  );
}
