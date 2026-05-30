"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { SvgText } from "./components/text/SvgText";
import { useHomeScroll } from "./components/home/useHomeScroll";
import { NAV_S0, NAV_S1, NAV_S2 } from "./components/home/constants";
import dynamic from "next/dynamic";
import { DesktopNav } from "./components/home/DesktopNav";
import { AeroSection } from "./components/home/AeroSection";
import { HomeFooter } from "./components/home/HomeFooter";
import { MobileHome } from "./components/home/MobileHome";
import { useResponsiveMode } from "./hooks/useResponsiveMode";

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
  const isSessionLoading = status === "loading";
  const getOneHref = useMemo(
    () => status === "authenticated" && session?.user ? "/order/units" : "/auth?from=order",
    [status, session]
  );
  const blockClickWhileLoading = (e: React.MouseEvent) => {
    if (isSessionLoading) e.preventDefault();
  };

  const nav = section === 0 ? NAV_S0 : section === 1 ? NAV_S1 : NAV_S2;

  // Post-hydration dual-tree unmount. Initial render = "both" → SSR HTML and
  // first paint identical to the previous DOM (no FOUC, no CLS, crawlers
  // still see both subtrees). Once useEffect fires, the off-viewport subtree
  // unmounts and never reconciles again until the viewport crosses 768px.
  // Visual diff is zero — the hidden subtree was already `display:none`
  // under the old setup.
  const mode = useResponsiveMode();
  const showMobile = mode !== "desktop";
  const showDesktop = mode !== "mobile";

  return (
    <main className="flex-1 overflow-x-hidden md:overflow-hidden relative">

      {/* Mobile: plain vertical scroll */}
      {showMobile && (
        <MobileHome getOneHref={getOneHref} isSessionLoading={isSessionLoading} />
      )}

      {/* Desktop: animated section panels */}
      {showDesktop && (
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
              onClick={blockClickWhileLoading}
              aria-disabled={isSessionLoading}
              className="group flex items-center gap-4 bg-[#f1f1f1] rounded-full p-[5px] pr-[30px] cursor-pointer transition-opacity"
            >
              <div className="px-8 py-4 bg-[#0000f4] rounded-full flex items-center justify-center">
                <SvgText text="Get One" weight="600" height={18} className="text-white" />
              </div>
              {/* <div className="w-[8px] h-[8px] rounded-full bg-[#aaaaaa] shrink-0 group-hover:bg-[#0000f4]" /> */}
              <SvgText text="Queue Me Up" weight="500" height={18} className="text-[#aaaaaa] group-hover:text-[#0000f4]" />

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
      )}

    </main>
  );
}
