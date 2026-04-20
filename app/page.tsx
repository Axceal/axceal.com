"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { AxcealLogo } from "./components/icons/AxcealLogo";

import { SvgText } from "./components/SvgText";

const SPRING = { type: "spring", stiffness: 70, damping: 15 } as const;

// All top values in % only (0%/50%/100%), all y values in px only — no unit mixing
// AeroText h=23px → center offset 12px; WhatCan/WhatsInside h=69px → center offset 35px
const S0 = {
  aero: { top: "50%", y: "-12px", opacity: 1 },
  whatcan: { top: "70%", y: "27px", opacity: 0.4 },
  whatsinside: { top: "90%", y: "20px", opacity: 0.4 },
} as const;

const S1 = {
  aero: { top: "0%", y: "20px", opacity: 0.4 },
  whatcan: { top: "50%", y: "-35px", opacity: 1 },
  whatsinside: { top: "100%", y: "-60px", opacity: 0.4 },
} as const;

const S2 = {
  aero: { top: "0%", y: "20px", opacity: 0.4 },
  whatcan: { top: "5%", y: "60px", opacity: 0.4 },
  whatsinside: { top: "50%", y: "-35px", opacity: 1 },
} as const;

export default function Home() {
  const [section, setSection] = useState(0);
  const locked = useRef(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    const slide = (dir: 1 | -1) => {
      if (locked.current) return;
      locked.current = true;
      setSection(s => Math.min(2, Math.max(0, s + dir)));
      setTimeout(() => { locked.current = false; }, 900);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 5) return;
      slide(e.deltaY > 0 ? 1 : -1);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown"].includes(e.key)) slide(1);
      else if (["ArrowUp", "PageUp"].includes(e.key)) slide(-1);
    };

    const onTouchStart = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      const diff = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(diff) > 40) slide(diff > 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const nav = section === 0 ? S0 : section === 1 ? S1 : S2;

  return (
    <main className="flex-1 overflow-hidden relative">

      {/* ── Left nav column — offset matches px-30 layout padding ── */}
      <div className="absolute inset-y-0 left-30 z-10">

        <motion.div className="absolute cursor-pointer" onClick={() => setSection(0)} initial={S0.aero} animate={nav.aero} transition={SPRING}>
          <SvgText text="Aero" weight="700" className="text-[#1e1e1e]" height={30} />
        </motion.div>

        <motion.div className="absolute cursor-pointer" onClick={() => setSection(1)} initial={S0.whatcan} animate={nav.whatcan} transition={SPRING}>
          <SvgText text={"What can Aero \ndo"} weight="700" className="text-[#1e1e1e] " height={28} />
        </motion.div>

        <motion.div className="absolute cursor-pointer" onClick={() => setSection(2)} initial={S0.whatsinside} animate={nav.whatsinside} transition={SPRING}>
          <SvgText text={"What's inside the \nbox"} weight="700" className="text-[#1e1e1e] " height={28} />
        </motion.div>

      </div>

      {/* ── Center — Aero image pinned to true page center ── */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          animate={{
            y: section === 0 ? "0vh" : "-100vh",
            opacity: section === 0 ? 1 : 0,
          }}
          transition={SPRING}
        >
          {/* Aero image — absolute center of page */}
          <div className="absolute left-[47%] top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <img src="/assests/aero svg.svg" alt="Aero x1" className="w-[450px]" />
              <div className="absolute left-[57%] top-[50%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
                <AxcealLogo className="h-4 w-auto text-[#0000f4]" />
                <SvgText text="Aero x1" weight="600" className="text-[#0000f4]" height={20} />
              </div>
            </div>
          </div>

          {/* Hero text — right side */}
          <div className="absolute right-70 top-1/2 -translate-y-1/2 flex flex-col gap-20">
            <SvgText text={"Be unconstrained in \nall you \ndo"} weight="700" className="text-[#0000f4]" height={24} />
            <SvgText text={"Do \nmore,\nstart frictionless"} weight="700" className="text-[#0000f4]" height={24} />
          </div>
        </motion.div>
      </div>

      {/* ── Get One — always visible at bottom centre ── */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button className="px-12 py-5.5 bg-blu rounded-full hover:opacity-90 transition-opacity cursor-pointer flex items-center">
          <SvgText text="Get One" weight="600" height={20} className="text-white" />
        </button>
      </div>

    </main>
  );
}
