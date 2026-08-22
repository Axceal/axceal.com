"use client";

import { useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SvgText } from "./components/text/SvgText";
import { useHomeScroll } from "./components/home/useHomeScroll";
import { NAV_S0, NAV_S1, NAV_S2 } from "./components/home/constants";
import dynamic from "next/dynamic";
import { DesktopNav } from "./components/home/DesktopNav";
import { AeroSection } from "./components/home/AeroSection";
import { HomeFooter } from "./components/home/HomeFooter";
import { MobileHome } from "./components/home/MobileHome";
import { useResponsiveMode } from "./hooks/useResponsiveMode";
import { isWaitlist } from "@/lib/featureFlags";
import { useWaitlistDialog } from "./components/waitlist/WaitlistDialog";
import { useWaitlistStatus } from "./hooks/useWaitlistStatus";
import { useWaitlistStatusRefresh } from "./components/waitlist/WaitlistStatusProvider";
import { AERO } from "@/lib/product";
import { formatINR, formatPosition } from "@/lib/format";

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
  const waitlistMode = isWaitlist();
  const waitlistStatus = useWaitlistStatus();
  const refreshWaitlistStatus = useWaitlistStatusRefresh();
  const dialog = useWaitlistDialog();
  const router = useRouter();
  const searchParams = useSearchParams();

  // W9 robustness — when we land at `/?joined=1`, the server already wrote
  // the waitlist row inside the register handler, but the in-memory status
  // state still reflects whatever was last loaded (or `idle` if session
  // just authenticated). One explicit refresh on the join landing closes
  // the gap between server insert and client state.
  useEffect(() => {
    if (!waitlistMode) return;
    if (searchParams.get("joined") !== "1") return;
    if (waitlistStatus.kind === "in") return;
    refreshWaitlistStatus();
    // Re-run only when the flag flips or status leaves "in" — once status
    // resolves to "in" the popup effect below takes over.
  }, [waitlistMode, searchParams, waitlistStatus.kind, refreshWaitlistStatus]);

  // W6 — `?joined=1` flag is set by the create-account redirect after a
  // successful waitlist join. Show popup-2 with the position the moment
  // the home page settles. Strip the query so a refresh does not re-open.
  useEffect(() => {
    if (!waitlistMode) return;
    if (searchParams.get("joined") !== "1") return;
    if (waitlistStatus.kind !== "in") return;
    dialog.openStatus(waitlistStatus.position);
    const next = new URLSearchParams(searchParams);
    next.delete("joined");
    router.replace(next.toString() ? `/?${next.toString()}` : "/");
  }, [waitlistMode, waitlistStatus, searchParams, router, dialog]);

  // Live mode: original link behaviour. Waitlist mode: clicks open dialogs
  // so we render a <button>, not a <Link>.
  const liveHref = useMemo(
    () => (status === "authenticated" && session?.user ? "/order/units" : "/auth?from=order"),
    [status, session],
  );

  // Waitlist sub-label: literal prompt for unauth/loading, queue line for
  // in-queue users. Live mode shows the INR price.
  const subLabel = waitlistMode
    ? waitlistStatus.kind === "in"
      ? `At ${formatPosition(waitlistStatus.position)} in Queue`
      : "Add me to Queue"
    : `INR ` + formatINR(AERO.priceInPaise);

  // Authed users in waitlist mode always see popup-2; the join popup is for
  // unauth visitors only. While `useWaitlistStatus` is mid-flight for an
  // authed session we ignore the click rather than flash the wrong dialog.
  const isAuthed = status === "authenticated" && !!session?.user;

  const handleCtaClick = (e: React.MouseEvent) => {
    if (isSessionLoading) {
      e.preventDefault();
      return;
    }
    if (!waitlistMode) return;
    e.preventDefault();
    if (isAuthed) {
      if (waitlistStatus.kind === "in") {
        dialog.openStatus(waitlistStatus.position);
      }
      // Loading / error: no-op until status resolves. Sub-label stays as
      // "Queue Me Up" so the user can retry once data lands.
      return;
    }
    dialog.openJoin();
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
    <main className="flex-1 overflow-x-hidden min-[769px]:overflow-hidden relative">

      {/* Mobile: plain vertical scroll */}
      {showMobile && (
        <MobileHome
          ctaHref={liveHref}
          ctaSubLabel={subLabel}
          ctaIsButton={waitlistMode}
          onCtaClick={handleCtaClick}
          isSessionLoading={isSessionLoading}
        />
      )}

      {/* Desktop: animated section panels */}
      {showDesktop && (
        <div className="hidden min-[769px]:block absolute inset-0 overflow-hidden">

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
            {waitlistMode ? (
              <button
                type="button"
                onClick={handleCtaClick}
                aria-disabled={isSessionLoading}
                className="group flex items-center gap-4 bg-[#f1f1f1] rounded-full p-[5px] pr-[30px] cursor-pointer transition-opacity"
              >
                <div className="px-8 py-4 bg-[#0000f4] rounded-full flex items-center justify-center">
                  <SvgText text="Get One" weight="600" height={18} className="text-white" />
                </div>
                <SvgText
                  text={subLabel}
                  weight="500"
                  height={18}
                  className="text-[#aaaaaa] group-hover:text-[#0000f4]"
                />
              </button>
            ) : (
              <Link
                href={liveHref}
                onClick={handleCtaClick}
                aria-disabled={isSessionLoading}
                className="group flex items-center gap-4 bg-[#f1f1f1] rounded-full p-[5px] pr-[30px] cursor-pointer transition-opacity"
              >
                <div className="px-8 py-4 bg-[#0000f4] rounded-full flex items-center justify-center">
                  <SvgText text="Get One" weight="600" height={18} className="text-white" />
                </div>
                <SvgText
                  text={subLabel}
                  weight="500"
                  height={18}
                  className="text-[#aaaaaa] group-hover:text-[#0000f4]"
                />
              </Link>
            )}
          </motion.div>

          {/* Footnote ref 2 — centered just above footer, fades in on S2 */}
          <motion.div
            className="absolute left-0 right-0 flex justify-center"
            initial={{ bottom: "90px", y: 80, opacity: 0 }}
            animate={{ bottom: "90px", y: section === 2 ? 0 : 80, opacity: section === 2 ? 1 : 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <SvgText text="# Specific performance numbers may vary as Aero is still under development and evaluation." weight="500" height={12} align="center" className="text-[#aaaaaa]" />
          </motion.div>

          {/* Footer — slides up from below when S2 is active */}
          <HomeFooter section={section} />

        </div>
      )}

    </main>
  );
}
