"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { AxcealLogo } from "../icons/brand/AxcealLogo";
import { SvgText } from "../text/SvgText";
import { XTwitterIcon } from "../icons/social/XTwitterIcon";
import { InstagramIcon } from "../icons/social/InstagramIcon";

interface Props {
  section: number;
}

// Desktop footer — slides up from below when S2 is active, hidden for S0/S1.
// Contains Axceal branding + copyright on the left, contact info on the right.
export function HomeFooter({ section }: Props) {
  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 lg:left-[clamp(1.5rem,8vw,7.5rem)] lg:right-[clamp(1.5rem,8vw,7.5rem)] bg-[#f1f1f1] rounded-none lg:rounded-t-[20px] py-5 lg:py-6 px-2 lg:px-8 flex flex-row items-center justify-between z-20"
      initial={{ y: "100%" }}
      animate={{ y: section === 2 ? "0%" : "100%" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Left: logo + brand name + copyright */}
      <div className="flex flex-col gap-1 lg:gap-2">
        <div className="flex flex-row items-center gap-2">
          <AxcealLogo className="h-3 w-auto text-[#aaaaaa]" />
          <SvgText text="Axceal" weight="600" height={12} className="text-[#aaaaaa]" />
        </div>
        {/* Mobile text */}
        <div className="flex lg:hidden">
          <SvgText text="All Right Belongs to Aectex Technologies Pvt. Ltd." weight="500" height={10} maxWidth={160} className="text-[#aaaaaa]" />
        </div>
        {/* Desktop text */}
        <div className="hidden lg:flex">
          <SvgText text="All intellectual property belongs to Aectex Technologies Pvt. Ltd." weight="500" height={12} maxWidth={Infinity} className="text-[#aaaaaa]" />
        </div>
      </div>

      {/* Right: Legal links + Contact info */}
      <div className="flex flex-row items-center gap-12">
        <div className="hidden lg:flex flex-row items-center gap-6">
          <div className="flex flex-row items-center gap-6 border-r border-[#aaaaaa] pr-6 h-[16px]">
            <Link href="https://x.com/Axcealin" target="_blank" rel="noopener noreferrer" className="text-[#aaaaaa] hover:text-[#0000f4] transition-colors focus:outline-none flex items-center justify-center">
              <XTwitterIcon />
            </Link>
            <Link href="https://www.instagram.com/axceal.in/" target="_blank" rel="noopener noreferrer" className="text-[#aaaaaa] hover:text-[#0000f4] transition-colors focus:outline-none flex items-center justify-center">
              <InstagramIcon />
            </Link>
          </div>
          <div className="flex flex-row items-center gap-6 border-r border-[#aaaaaa] pr-6 h-[16px]">
            <Link href="/privacy" className="text-[#aaaaaa] hover:text-[#0000f4] transition-colors focus:outline-none flex items-center justify-center">
              <SvgText text="Privacy Policy" weight="500" height={12} />
            </Link>
            <Link href="/terms" className="text-[#aaaaaa] hover:text-[#0000f4] transition-colors focus:outline-none flex items-center justify-center">
              <SvgText text="Terms & Conditions" weight="500" height={12} />
            </Link>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 lg:gap-2">
          <SvgText text="Contact" weight="500" height={12} className="text-[#aaaaaa]" />
          {/* Mobile contact text */}
          <div className="flex lg:hidden">
            <SvgText text="contact@axceal.com | +91 88302-61513" weight="500" height={10} maxWidth={Infinity} className="text-[#aaaaaa]" />
          </div>
          {/* Desktop contact text */}
          <div className="hidden lg:flex">
            <SvgText text="contact@axceal.com | +91 88302-61513" weight="500" height={12} maxWidth={Infinity} className="text-[#aaaaaa]" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
