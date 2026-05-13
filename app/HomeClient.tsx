"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SvgText } from "./components/SvgText";
import { useHomeScroll } from "./components/home/useHomeScroll";
import { NAV_S0, NAV_S1, NAV_S2, SPRING } from "./components/home/constants";
import dynamic from "next/dynamic";
import { DesktopNav } from "./components/home/DesktopNav";
import { AeroSection } from "./components/home/AeroSection";
import { HomeFooter } from "./components/home/HomeFooter";
import { MobileHome } from "./components/home/MobileHome";

const WhatCanAeroSection = dynamic(
  () => import("./components/home/WhatCanAeroSection").then((m) => ({ default: m.WhatCanAeroSection })),
  { ssr: false }
);
const WhatsInsideSection = dynamic(
  () => import("./components/home/WhatsInsideSection").then((m) => ({ default: m.WhatsInsideSection })),
  { ssr: false }
);

export function HomeClient() {
  const { data: session, status } = useSession();
  const { section, subSlide, goSection, goSubSlide } = useHomeScroll();
  const getOneHref = useMemo(
    () => status === "authenticated" && session?.user ? "/order/units" : "/auth?from=order",
    [status, session]
  );

  const nav = section === 0 ? NAV_S0 : section === 1 ? NAV_S1 : NAV_S2;

  return (
    <main className="flex-1 overflow-x-hidden md:overflow-hidden relative">

      {/* Mobile: plain vertical scroll */}
      <MobileHome getOneHref={getOneHref} />

      {/* Desktop: animated section panels */}
      <div className="hidden md:block absolute inset-0 overflow-hidden">

        {/* Left nav labels — animate position based on active section */}
        <DesktopNav nav={nav} goSection={goSection} goSubSlide={goSubSlide} />

        {/* S0: Aero device + hero text */}
        <AeroSection section={section} />

        {/* S1: What can Aero do — 5 subslides */}
        <WhatCanAeroSection section={section} subSlide={subSlide} goSubSlide={goSubSlide} />

        {/* S2: What's inside the box */}
        <WhatsInsideSection section={section} />

        {/* Get One CTA — paddingBottom grows to match footer height, button rides up in sync */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 flex justify-center"
          initial={{ paddingBottom: "32px" }}
          animate={{ paddingBottom: section === 2 ? "120px" : "32px" }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Link
            href={getOneHref}
            className="px-8 py-4 bg-[#0000f4] rounded-full hover:opacity-90 transition-opacity cursor-pointer flex items-center"
          >
            <SvgText text="Get One" weight="600" height={18} className="text-white" />
          </Link>
        </motion.div>

        {/* Footnote ref 2 — left-aligned at nav margin, just above footer, fades in on S2 */}
        <motion.div
          className="absolute left-[clamp(1.5rem,8vw,7.5rem)]"
          initial={{ bottom: "90px", y: 80, opacity: 0 }}
          animate={{ bottom: "90px", y: section === 2 ? 0 : 80, opacity: section === 2 ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <SvgText text="2. Description" weight="500" height={12} className="text-[#aaaaaa] ml-10" />
        </motion.div>

        {/* Footer — slides up from below when S2 is active */}
        <HomeFooter section={section} />

      </div>

    </main>
  );
}
