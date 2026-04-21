"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SvgText } from "../../components/SvgText";
import { RightArrow } from "../../components/icons/RightArrow";

const STEPS = [
    { label: "Credentials", active: true },
    { label: "Order", active: true },
    { label: "Billing & Shipping", active: false },
    { label: "Payment", active: false },
];

const MIN_QTY = 1;
const MAX_QTY = 5;
const VISIBLE = 5;   // rows shown in the drum picker
const ROW_H = 44;    // px per row

export default function OrderUnitsPage() {
    const router = useRouter();
    const [quantity, setQuantity] = useState(1);
    const dirRef = useRef(0);

    const center = Math.floor(VISIBLE / 2); // index 2 — always the selected row
    const start = quantity - center;
    const rows = Array.from({ length: VISIBLE }, (_, i) => start + i);

    const change = (next: number) => {
        dirRef.current = next > quantity ? 1 : -1;
        setQuantity(next);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        if (e.deltaY > 0) change(Math.min(quantity + 1, MAX_QTY));
        else change(Math.max(quantity - 1, MIN_QTY));
    };

    return (
        <main className="flex-1 flex flex-col items-center pt-8 pb-12">

            {/* ── Progress stepper ── */}
            <div className="flex items-center gap-10 mb-14">
                {STEPS.map((step, i) => (
                    <div key={step.label} className="flex items-center gap-10">
                        <SvgText
                            text={step.label}
                            weight="600"
                            height={16}
                            className={step.active ? "text-[#0000f4]" : "text-[#1e1e1e]"}
                        />
                        {i < STEPS.length - 1 && (
                            <RightArrow
                                className={STEPS[i + 1].active ? "text-[#0000f4]" : "text-[#1e1e1e]"}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* ── Content ── */}
            <div className="flex flex-col gap-4 items-center">

                {/* "Units" heading — left-aligned with the product card */}
                <div className="self-start">
                    <SvgText text="Units" weight="600" height={18} className="text-[#1e1e1e]" />
                </div>

                {/* Product card + quantity picker */}
                <div
                    className="relative w-[280px] h-[260px] select-none"
                    onWheel={handleWheel}
                    style={{ touchAction: "none" }}
                >
                    {/* Aero product card — centered */}
                    <div className="bg-[#f1f1f1] rounded-[20px] w-full h-full flex items-center justify-center">
                        <img
                            src="/assests/aero svg.svg"
                            alt="Aero x1"
                            className="w-[200px]"
                        />
                    </div>

                    {/* Drum picker floats right, doesn't affect card centering */}
                    <motion.div
                        key={quantity}
                        className="absolute top-1/2 -translate-y-1/2 left-[calc(100%+32px)] flex items-stretch gap-4"
                        initial={{ y: dirRef.current * 12, opacity: 0.5 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    >

                        {/* X marker — only visible at the center (selected) row */}
                        <div className="flex flex-col">
                            {rows.map((_, i) => (
                                <div
                                    key={i}
                                    style={{ height: `${ROW_H}px` }}
                                    className="flex items-center"
                                >
                                    {i === center && (
                                        <SvgText text="X" weight="600" height={18} className="text-[#1e1e1e]" />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Numbers column */}
                        <div className="flex flex-col">
                            {rows.map((num, i) => {
                                const isSelected = i === center;
                                const dist = Math.abs(i - center);
                                const inRange = num >= MIN_QTY && num <= MAX_QTY;
                                const opacity = !inRange ? 0 : isSelected ? 1 : dist === 1 ? 0.35 : 0.15;

                                return (
                                    <div
                                        key={i}
                                        style={{ height: `${ROW_H}px`, opacity, transition: "opacity 0.15s" }}
                                        className={`flex items-center ${inRange ? "cursor-pointer" : ""}`}
                                        onClick={() => {
                                            if (inRange) change(num);
                                        }}
                                    >
                                        <SvgText
                                            text={inRange ? String(num) : ""}
                                            weight="600"
                                            height={isSelected ? 20 : 16}
                                            className="text-[#1e1e1e]"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>

                {/* Caption */}
                <SvgText
                    text="What's inside the box"
                    weight="500"
                    height={14}
                    className="text-[#aaaaaa]"
                />

                {/* Proceed button */}
                <button
                    type="button"
                    onClick={() => router.push(`/order/billing-shipping?qty=${quantity}`)}
                    className="bg-[#0000f4] rounded-full px-[40px] py-4.5 mt-[140px] cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none flex justify-center"
                >
                    <SvgText text="Proceed" weight="600" height={16} className="text-white" />
                </button>
            </div>
        </main>
    );
}
