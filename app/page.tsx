"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
  const [getOneHref, setGetOneHref] = useState("/auth?from=order");
  const locked = useRef(false);
  const touchStartY = useRef(0);

  // Resolve target on mount: authed → /order/units, else → /auth?from=order.
  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/auth/session", { signal: ac.signal, cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then((session: { user?: unknown } | null) => {
        if (session?.user) setGetOneHref("/order/units");
      })
      .catch(() => { /* keep /auth?from=order default */ });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const slide = (dir: 1 | -1) => {
      if (locked.current) return;
      locked.current = true;
      setSection(s => Math.min(2, Math.max(0, s + dir)));
      setTimeout(() => { locked.current = false; }, 900);
    };

    const onWheel = (e: WheelEvent) => {
      if (window.innerWidth < 768) return; // Allow normal scrolling on mobile
      e.preventDefault();
      if (Math.abs(e.deltaY) < 5) return;
      slide(e.deltaY > 0 ? 1 : -1);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (window.innerWidth < 768) return;
      if (["ArrowDown", "PageDown"].includes(e.key)) slide(1);
      else if (["ArrowUp", "PageUp"].includes(e.key)) slide(-1);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (window.innerWidth < 768) return;
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (window.innerWidth < 768) return;
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
    <main className="flex-1 overflow-x-hidden md:overflow-hidden relative">

      {/* ── MOBILE FLOW (hidden on tablet/desktop) ── */}
      <div className="md:hidden flex flex-col w-full px-6 pt-10 pb-32 gap-16">

        {/* Section 1: Aero */}
        <div className="flex flex-col gap-8">
          <SvgText text="Aero" weight="700" className="text-[#1e1e1e] ml-2" height={26} />

          <div className="relative w-full max-w-[300px] mx-auto mt-4">
            <img src="/assests/aero svg.svg" alt="Aero x1" className="w-full h-auto " />
            <div className="absolute left-[57%] top-[50%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
              <AxcealLogo className="h-3 w-auto text-[#0000f4]" />
              <SvgText text="Aero x1" weight="600" className="text-[#0000f4] " height={16} />
            </div>
          </div>
        </div>

        {/* Section 2: What can Aero do */}
        <div className="flex flex-col mt-4">
          <SvgText text={"What can Aero\ndo"} weight="700" className="text-[#1e1e1e] ml-2" height={26} />
        </div>

        {/* CTA Button - Fixed Position */}
        <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center">
          <Link
            href={getOneHref}
            className="px-8 py-4 bg-[#0000f4] rounded-full hover:opacity-90 transition-opacity cursor-pointer flex items-center"
          >
            <SvgText text="Get One" weight="600" height={18} className="text-white" />
          </Link>
        </div>

        {/* Section 3: What's inside the box */}
        <div className="flex flex-col gap-12 mt-8">
          <SvgText text={"What's inside\nthe Box"} weight="700" className="text-[#1e1e1e] ml-2" height={26} />

          {/* <div className="flex flex-col items-center gap-4">
            <div className="w-[200px]">
              <img src="/assests/aero svg.svg" alt="Aero x1" className="w-full h-auto" />
            </div>
            <SvgText text="Aero x1" weight="600" className="text-[#1e1e1e] ml-2" height={18} />
          </div> */}
        </div>

      </div>

      {/* ── DESKTOP FLOW (hidden on mobile) ── */}
      <div className="hidden md:block absolute inset-0 overflow-hidden">
        {/* Left nav column */}
        <div className="absolute inset-y-0 left-[clamp(1.5rem,8vw,7.5rem)] z-10">
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

        {/* Center — Aero image pinned to true page center */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute inset-0 flex flex-col md:block"
            animate={{
              y: section === 0 ? "0vh" : "-100vh",
              opacity: section === 0 ? 1 : 0,
            }}
            transition={SPRING}
          >
            {/* Aero image */}
            <div className="absolute md:left-1/2 lg:left-[47%] md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex justify-center transition-all duration-500">
              <div className="relative w-[clamp(250px,50vw,350px)] lg:w-[450px] transition-all duration-500">
                <img src="/assests/aero svg.svg" alt="Aero x1" className="w-full h-auto" />
                <div className="absolute left-[57%] top-[50%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
                  <AxcealLogo className="h-[clamp(12px,3vw,16px)] w-auto text-[#0000f4]" />
                  <SvgText text="Aero x1" weight="600" className="text-[#0000f4]" height={20} />
                </div>
              </div>
            </div>

            {/* Hero text */}
            <div className="hidden lg:flex absolute md:right-[clamp(2rem,15vw,17.5rem)] md:top-1/2 md:-translate-y-1/2 flex-col gap-[clamp(2rem,10vh,5rem)] items-end text-left">
              <SvgText align="right" text={"Be unconstrained in\nall you\ndo"} weight="700" className="text-[#0000f4]" height={24} />
              <SvgText align="right" text={"Do\nmore,\nbe frictionless"} weight="700" className="text-[#0000f4]" height={24} />
            </div>
          </motion.div>
        </div>

        {/* Get One — always visible at bottom centre */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <Link
            href={getOneHref}
            className="px-8 py-4 bg-blu rounded-full hover:opacity-90 transition-opacity cursor-pointer flex items-center"
          >
            <SvgText text="Get One" weight="600" height={18} className="text-white" />
          </Link>
        </div>
      </div>

    </main>
  );
}
