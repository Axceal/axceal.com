"use client";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AxcealLogo } from "../icons/AxcealLogo";
import { SvgText } from "../SvgText";
import { CuesIcon } from "../icons/CuesIcon";
import { NavigationIcon } from "../icons/NavigationIcon";
import { SenseIcon } from "../icons/SenseIcon";
import { FeatherIcon } from "../icons/FeatherIcon";
import { BatteryIcon } from "../icons/BatteryIcon";
import { AeroIcon } from "../icons/AeroIcon";
import { AeroCuesSlideIcon } from "../icons/AeroCuesSlideIcon";
import { AeroNavigationSlideIcon } from "../icons/AeroNavigationSlideIcon";
import { AeroSenseSlideIcon } from "../icons/AeroSenseSlideIcon";
import { AeroFeatherSlideIcon } from "../icons/AeroFeatherSlideIcon";
import { AeroBatterySlideIcon } from "../icons/AeroBatterySlideIcon";

type SlideIcon = (props: { className: string; alt: string }) => React.ReactElement;

const AERO_SLIDES: { Icon: SlideIcon; className: string }[] = [
  { Icon: AeroIcon, className: "w-full h-auto max-h-[320px] object-contain" },
  { Icon: AeroCuesSlideIcon, className: "h-auto w-[300px] max-w-full object-contain" },
  { Icon: AeroNavigationSlideIcon, className: "h-[360px] w-auto max-w-full object-contain" },
  { Icon: AeroSenseSlideIcon, className: "h-[300px] w-auto max-w-full object-contain" },
  { Icon: AeroFeatherSlideIcon, className: "h-[360px] w-auto max-w-full object-contain" },
  { Icon: AeroBatterySlideIcon, className: "h-[360px] w-auto max-w-full object-contain" },
];

interface Props {
  // Resolved on mount: "/order/units" if authed, "/auth?from=order" otherwise
  getOneHref: string;
}

// Mobile layout — simple vertical scroll through all three sections.
// Scroll-snap and Framer Motion animations are desktop-only; mobile gets a plain
// linear flow so the OS scroll behaviour feels native.
export function MobileHome({ getOneHref }: Props) {
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerVisible, setFooterVisible] = useState(false);
  const [aeroSlide, setAeroSlide] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const touchStartX = useRef<number>(0);

  const goAeroSlide = (next: number) => {
    setSlideDir(next > aeroSlide ? 1 : -1);
    setAeroSlide(next);
  };

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="md:hidden flex flex-col w-full px-6 pt-10 gap-10 min-h-[calc(100dvh-75px)]">

      {/* Section 1: Aero — full-viewport-height slider */}
      <div className="flex flex-col gap-4 min-h-[calc(100dvh-115px)]">
        <SvgText text="Aero" weight="700" className="text-[#1e1e1e] ml-2" height={26} />

        <div
          className="relative flex-1 overflow-hidden"
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const delta = touchStartX.current - e.changedTouches[0].clientX;
            if (delta > 50 && aeroSlide < AERO_SLIDES.length - 1) goAeroSlide(aeroSlide + 1);
            if (delta < -50 && aeroSlide > 0) goAeroSlide(aeroSlide - 1);
          }}
        >
          <AnimatePresence mode="sync" custom={slideDir} initial={false}>
            <motion.div
              key={aeroSlide}
              custom={slideDir}
              variants={{
                enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%" }),
                center: { x: "0%" },
                exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%" }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0 pb-40 flex items-center justify-center"
            >
              {aeroSlide === 0 ? (
                <div className="relative w-full max-w-[320px] mx-auto">
                  <AeroIcon alt="Aero x1" className={AERO_SLIDES[0].className} priority />
                  <div className="absolute left-[57%] top-[50%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
                    <AxcealLogo className="h-3 w-auto text-[#0000f4]" />
                    <SvgText text="Aero x1" weight="600" className="text-[#0000f4]" height={16} />
                  </div>
                </div>
              ) : (
                (() => { const { Icon, className } = AERO_SLIDES[aeroSlide]; return <Icon alt={`Aero view ${aeroSlide}`} className={className} />; })()
              )}
            </motion.div>
          </AnimatePresence>

          {/* Progress dots — stable, not part of slide animation */}
          <div className="absolute bottom-30 left-0 right-0 flex justify-center gap-2">
            {AERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goAeroSlide(i)}
                className={`h-[2.5px] w-8 rounded-full transition-colors duration-300 ${aeroSlide === i ? "bg-[#0000f4]" : "bg-[#f1f1f1]"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: What can Aero do — 5 features, each: text+icon row then image */}
      <div className="flex flex-col gap-12 -mt-[70px]">
        <SvgText text={"What can Aero\ndo"} weight="700" className="text-[#1e1e1e] ml-2" height={26} />

        {/* Feature 1: Multi dimensional Cues */}
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-4">
              <SvgText text="Multi dimensional Cues" weight="600" height={14} className="text-[#aaaaaa]" />
              <SvgText text="Up to Milli second Cues latency" weight="600" height={14} className="text-[#aaaaaa]" superscript="1" />
            </div>
            <CuesIcon className="w-8 h-auto text-[#aaaaaa] flex-shrink-0" />
          </div>
        </div>
        <span
          className="block w-[10px] self-center aspect-square rounded-full bg-[#aaaaaa] -mt-[15px] -mb-[15px]"
          aria-hidden
        />

        {/* Feature 2: All axis anchor navigation */}
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-4">
              <SvgText text="All axis anchor navigation" weight="600" height={14} className="text-[#aaaaaa]" />
              <SvgText text="Up to Micro second navigation latency" weight="600" height={14} className="text-[#aaaaaa]" superscript="9" />
              <SvgText text="Up to Milli second Wrap Rate" weight="600" height={14} className="text-[#aaaaaa]" />
            </div>
            <NavigationIcon className="w-14 h-auto flex-shrink-0" />
          </div>
        </div>
        <span
          className="block w-[10px] self-center aspect-square rounded-full bg-[#aaaaaa] -mt-[15px] -mb-[15px]"
          aria-hidden
        />

        {/* Feature 3: Surround Sense */}
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-4">
              <SvgText text="Surround Sense" weight="600" height={14} className="text-[#aaaaaa]" />
              <SvgText text={"Receive multi dimensional updates\nfor Cues"} weight="600" height={14} className="text-[#aaaaaa]" />
              <SvgText text="Aomni-Fit have on Softech design" weight="600" height={14} className="text-[#aaaaaa]" />
            </div>
            <SenseIcon className="w-8 h-auto text-[#aaaaaa] flex-shrink-0" />
          </div>
        </div>
        <span
          className="block w-[10px] self-center aspect-square rounded-full bg-[#aaaaaa] -mt-[15px] -mb-[15px]"
          aria-hidden
        />

        {/* Feature 4: Feather Light */}
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-4">
              <SvgText text="90g on your Palm" weight="600" height={14} className="text-[#aaaaaa]" />
              <SvgText text="Light Aluminum and glass build" weight="600" height={14} className="text-[#aaaaaa]" />
              <SvgText text={"IP68 water, dust rating and\nIK06 impact rating"} weight="600" height={14} className="text-[#aaaaaa]" />
            </div>
            <FeatherIcon className="w-8 h-auto text-[#aaaaaa] flex-shrink-0" />
          </div>
        </div>
        <span
          className="block w-[10px] self-center aspect-square rounded-full bg-[#aaaaaa] -mt-[15px] -mb-[15px]"
          aria-hidden
        />

        {/* Feature 5: Battery */}
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-4">
              <SvgText text="Up to 23hr Battery Life" weight="600" height={14} className="text-[#aaaaaa]" superscript="2" />
              <SvgText text="25W Type-C charging" weight="600" height={14} className="text-[#aaaaaa]" />
            </div>
            <BatteryIcon className="w-9 h-auto text-[#aaaaaa] flex-shrink-0" />
          </div>

        </div>
      </div>

      {/* CTA — fixed at bottom-8, translates up when footer enters viewport */}
      <motion.div
        className="fixed bottom-8 left-0 right-0 z-50 flex justify-center"
        animate={{ y: footerVisible ? -80 : 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <Link
          href={getOneHref}
          className="px-8 py-4 bg-[#0000f4] rounded-full hover:opacity-90 transition-opacity cursor-pointer flex items-center"
        >
          <SvgText text="Get One" weight="600" height={18} className="text-white" />
        </Link>
      </motion.div>

      {/* Section 3: What's inside the box */}
      <div className="flex flex-col gap-12 mt-8">
        <SvgText text={"What's inside\nthe Box"} weight="700" className="text-[#1e1e1e] ml-2" height={26} />
      </div>

      {/* Spacer so fixed Get One button doesn't overlap footer content */}
      <div className="h-50" />

      {/* Footer — full width, pushed to viewport bottom via mt-auto */}
      <div ref={footerRef} className="-mx-6 bg-[#f1f1f1] px-6 py-5 flex flex-row items-center justify-between mt-auto">
        <div className="flex flex-col gap-1">
          <div className="flex flex-row items-center gap-2">
            <AxcealLogo className="h-3 w-auto text-[#aaaaaa]" />
            <SvgText text="Axceal" weight="600" height={12} className="text-[#aaaaaa]" />
          </div>
          <SvgText text="All Right Belongs to Axceal Pvt. Ltd." weight="500" height={10} className="text-[#aaaaaa]" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <SvgText text="Contact" weight="500" height={12} className="text-[#aaaaaa]" />
          <SvgText text="contact@axceal.com | +91 88302-61513" weight="500" height={10} className="text-[#aaaaaa]" />
        </div>
      </div>

    </div>
  );
}
