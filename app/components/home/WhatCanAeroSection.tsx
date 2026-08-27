"use client";
import { motion } from "framer-motion";
import { SvgText } from "../text/SvgText";
import { SPRING, S1_SUBSLIDE_COUNT } from "./constants";
import { CuesIcon } from "../icons/feature/CuesIcon";
import { NavigationIcon } from "../icons/feature/NavigationIcon";
import { SenseIcon } from "../icons/feature/SenseIcon";
import { FeatherIcon } from "../icons/feature/FeatherIcon";
import { BatteryIcon } from "../icons/feature/BatteryIcon";
import { AeroCuesSlideIcon } from "../icons/slide/AeroCuesSlideIcon";
import { AeroNavigationSlideIcon } from "../icons/slide/AeroNavigationSlideIcon";
import { AeroSenseSlideIcon } from "../icons/slide/AeroSenseSlideIcon";
import { AeroFeatherSlideIcon } from "../icons/slide/AeroFeatherSlideIcon";
import { AeroBatterySlideIcon } from "../icons/slide/AeroBatterySlideIcon";

interface Props {
  section: number;
  subSlide: number;
  goSubSlide: (n: number) => void;
}

// Helper: compute slide y position.
// Active → "0vh", already-passed → "-100vh" (above), upcoming → "100vh" (below)
function subSlideY(i: number, subSlide: number, section: number): string {
  if (section === 1 && subSlide === i) return "0vh";
  return subSlide > i ? "-100vh" : "100vh";
}

// Desktop S1 panel: "What can Aero do" — contains 5 subslides, each with a unique
// device image, feature copy, and icon. The outer panel slides in from below when
// the user enters S1 and exits upward when leaving to S2.
//
// Right-side layout: each subslide has ONE flex-row container [text | icon].
// This keeps the icon in flow relative to the text instead of independently absolute.
// The progress indicator uses a flex justify-center column pinned to the far right.
export function WhatCanAeroSection({ section, subSlide, goSubSlide }: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Outer panel — handles section-level enter/exit */}
      <motion.div
        className="absolute inset-0"
        initial={{ y: "100vh", opacity: 0 }}
        animate={{
          y: section === 1 ? "0vh" : section < 1 ? "100vh" : "-100vh",
          opacity: section === 1 ? 1 : 0,
        }}
        transition={SPRING}
      >

        {/* ── Subslide 0: Multi dimensional Cues ── */}
        <motion.div
          className="absolute inset-0"
          initial={{ y: "100vh", opacity: 0 }}
          animate={{ y: subSlideY(0, subSlide, section), opacity: section === 1 && subSlide === 0 ? 1 : 0 }}
          transition={SPRING}
        >
          <div className="absolute left-1/2 -translate-x-1/2 top-[12%]">
            <AeroCuesSlideIcon alt="Aero top view" className="w-[clamp(300px,100vw,400px)] h-auto" />
          </div>
          {/* flex row: text flows left, icon flows right — no separate absolute for icon */}
          <div className="absolute right-[clamp(8rem,5vw,6rem)] top-1/2 -translate-y-1/2 flex flex-row items-center gap-10">
            <div className="flex flex-col gap-10 items-end">
              <SvgText as="h2" text="Multi dimensional Cues" weight="600" height={16} maxWidth={Infinity} className="text-[#1e1e1e]" />
              <SvgText text="Up to Milli-second Cues latency" weight="600" height={16} className="text-[#1e1e1e]" superscript="1" />
            </div>
            <CuesIcon className="w-8 h-auto text-[#aaaaaa] flex-shrink-0" />
          </div>
        </motion.div>

        {/* ── Subslide 1: All axis anchor navigation ── */}
        <motion.div
          className="absolute inset-0"
          initial={{ y: "100vh", opacity: 0 }}
          animate={{ y: subSlideY(1, subSlide, section), opacity: section === 1 && subSlide === 1 ? 1 : 0 }}
          transition={SPRING}
        >
          <div className="absolute left-1/2 -translate-x-1/2 top-[8%]">
            <AeroNavigationSlideIcon alt="Aero side view" className="w-[clamp(160px,32vw,100px)] h-auto" />
          </div>
          <div className="absolute right-[clamp(8rem,5vw,6rem)] top-1/2 -translate-y-1/2 flex flex-row items-center gap-10">
            <div className="flex flex-col gap-10 items-end">
              <SvgText as="h2" text="All axis anchor navigation" weight="600" height={16} maxWidth={Infinity} className="text-[#1e1e1e]" />
              <SvgText text="Up to Micro-second navigation latency" weight="600" height={16} className="text-[#1e1e1e]" superscript="9" />
              <SvgText text="Up to Milli-second Wrap Rate" weight="600" height={16} className="text-[#1e1e1e]" />
            </div>
            <NavigationIcon className="w-14 h-auto flex-shrink-0" />
          </div>
        </motion.div>

        {/* ── Subslide 2: Surround Sense ── */}
        <motion.div
          className="absolute inset-0"
          initial={{ y: "100vh", opacity: 0 }}
          animate={{ y: subSlideY(2, subSlide, section), opacity: section === 1 && subSlide === 2 ? 1 : 0 }}
          transition={SPRING}
        >
          {/* Portrait image — constrained by height to avoid overflow */}
          <div className="absolute left-[50%] -translate-x-1/2 top-[10%]">
            <AeroSenseSlideIcon alt="Aero inside view" className="h-[clamp(160px,52vh,160px)] w-auto" />
          </div>
          <div className="absolute right-[clamp(8rem,5vw,6rem)] top-1/2 -translate-y-1/2 flex flex-row items-center gap-10">
            <div className="flex flex-col gap-10 items-end">
              <SvgText as="h2" text="Surround Sense" weight="600" height={16} maxWidth={Infinity} className="text-[#1e1e1e]" />
              <SvgText text={"Receive multi dimensional updates for Cues"} weight="600" height={16} className="text-[#1e1e1e]" align="right" />
              <SvgText text="Omni-Fit have on Softech design" weight="600" height={16} className="text-[#1e1e1e]" />
            </div>
            <SenseIcon className="w-8 h-auto text-[#aaaaaa] flex-shrink-0" />
          </div>
        </motion.div>

        {/* ── Subslide 3: Feather Light ── */}
        <motion.div
          className="absolute inset-0"
          initial={{ y: "100vh", opacity: 0 }}
          animate={{ y: subSlideY(3, subSlide, section), opacity: section === 1 && subSlide === 3 ? 1 : 0 }}
          transition={SPRING}
        >
          <div className="absolute left-1/2 -translate-x-1/2 top-[10%]">
            <AeroFeatherSlideIcon alt="Aero side profile" className="w-[clamp(260px,40vw,240px)] h-auto" />
          </div>
          <div className="absolute right-[clamp(8rem,5vw,6rem)] top-1/2 -translate-y-1/2 flex flex-row items-center gap-10">
            <div className="flex flex-col gap-10 items-end">
              <SvgText as="h2" text="90g on your Palm" weight="600" height={16} maxWidth={Infinity} className="text-[#1e1e1e]" />
              <SvgText text="Light Aluminum and glass build" weight="600" align="right" height={16} className="text-[#1e1e1e]" />
              <SvgText text={"IP68 water, dust rating and IK06 impact rating"} weight="600" maxWidth={Infinity} height={16} className="text-[#1e1e1e]" align="right" />
            </div>
            <FeatherIcon isActive={section === 1 && subSlide === 3} className="w-8 h-auto text-[#aaaaaa] flex-shrink-0" />
          </div>
        </motion.div>

        {/* ── Subslide 4: Battery ── */}
        <motion.div
          className="absolute inset-0"
          initial={{ y: "100vh", opacity: 0 }}
          animate={{ y: subSlideY(4, subSlide, section), opacity: section === 1 && subSlide === 4 ? 1 : 0 }}
          transition={SPRING}
        >
          {/* Slim portrait image — constrained by height */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[25%]">
            <AeroBatterySlideIcon alt="Aero battery view" className="h-[clamp(160px,80vh,140px)] w-auto" />
          </div>
          <div className="absolute right-[clamp(8rem,5vw,6rem)] top-1/2 -translate-y-1/2 flex flex-row items-center gap-10">
            <div className="flex flex-col gap-10 items-end">
              <SvgText as="h2" text="Up to 23hr Battery Life" weight="600" height={16} maxWidth={Infinity} className="text-[#1e1e1e]" superscript="2" />
              <SvgText text="25W Type-C charging" weight="600" height={16} className="text-[#1e1e1e]" />
            </div>
            <BatteryIcon className="w-9 h-auto text-[#aaaaaa] flex-shrink-0" />
          </div>
        </motion.div>

        {/* Progress indicator — flex column centered against the right edge.
            Uses top-0/bottom-0 + justify-center instead of the translate-y trick. */}
        <div className="absolute right-20 top-0 bottom-0 flex flex-col justify-center gap-2 items-center">
          {Array.from({ length: S1_SUBSLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              onClick={() => goSubSlide(i)}
              className={`w-[2.5px] h-8 rounded-full transition-colors duration-300 ${subSlide === i ? "bg-[#0000f4]" : "bg-[#f1f1f1]"}`}
            />
          ))}
        </div>

      </motion.div>
    </div>
  );
}
