"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SvgText } from "../../components/SvgText";
import { Stepper, type Step } from "../../components/Stepper";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import { AeroIcon } from "../../components/icons/AeroIcon";

const STEPS: Step[] = [
    { label: "Order", state: "current", href: "/order/units" },
    { label: "Billing & Shipping", state: "upcoming", href: "/order/billing-shipping" },
    { label: "Payment", state: "upcoming", href: "/order/payment" },
];

const MIN_QTY = 1;
const MAX_QTY = 5;
const VISIBLE = 5;   // rows shown in the drum picker
const ROW_H = 44;    // px per row

export default function OrderUnitsPage() {
    const gating = useAuthGate();
    const router = useRouter();
    const [quantity, setQuantity] = useState(1);
    const [dir, setDir] = useState(0);

    const center = Math.floor(VISIBLE / 2); // index 2 — always the selected row
    const start = quantity - center;
    const rows = Array.from({ length: VISIBLE }, (_, i) => start + i);

    const change = (next: number) => {
        setDir(next > quantity ? 1 : -1);
        setQuantity(next);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        if (e.deltaY > 0) change(Math.min(quantity + 1, MAX_QTY));
        else change(Math.max(quantity - 1, MIN_QTY));
    };

    if (gating) return null;

    return (
        <main className="flex-1 flex flex-col items-center pt-4 pb-4">

            {/* ── Progress stepper ── */}
            <Stepper steps={STEPS} className="mb-10" />

            {/* ── Content ── */}
            <div className="flex flex-col gap-4 items-center sm:items-start w-full sm:w-fit px-4 sm:px-0">

                {/* "Units" heading */}
                <SvgText text="Units" weight="600" height={18} className="text-[#1e1e1e] sm:ml-[10px]" />

                {/* Card + desktop drum picker in one relative container */}
                <div
                    className="relative w-[320px] sm:w-[300px] h-[320px] sm:h-[300px] select-none"
                    onWheel={handleWheel}
                    style={{ touchAction: "none" }}
                >
                    <div className="bg-[#f1f1f1] rounded-[20px] w-full h-full flex items-center justify-center">
                        <AeroIcon alt="Aero x1" className="w-[60%] sm:w-[200px]" />
                    </div>

                    {/* Desktop drum picker: absolute, floats right of card */}
                    <motion.div
                        key={quantity}
                        className="hidden sm:flex absolute top-1/2 -translate-y-1/2 left-[calc(100%+32px)] items-stretch gap-4"
                        initial={{ y: dir * 12, opacity: 0.5 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    >
                        {/* X marker column */}
                        <div className="flex flex-col">
                            {rows.map((_, i) => (
                                <div key={i} style={{ height: `${ROW_H}px` }} className="flex items-center">
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
                                        onClick={() => { if (inRange) change(num); }}
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
                <SvgText text="What's inside the box" weight="500" height={14} className="text-[#aaaaaa] self-center" />

                {/* Mobile only: X above, sliding number picker below */}
                <div className="flex sm:hidden flex-col items-center gap-3">
                    <SvgText text="X" weight="600" height={18} className="text-[#1e1e1e]" />
                    <div className="flex items-center">
                        {[-2, -1, 0, 1, 2].map(offset => {
                            const num = quantity + offset;
                            const inRange = num >= MIN_QTY && num <= MAX_QTY;
                            const isSelected = offset === 0;
                            const opacity = !inRange ? 0 : isSelected ? 1 : Math.abs(offset) === 1 ? 0.35 : 0.15;
                            return (
                                <button
                                    key={offset}
                                    onClick={() => inRange && change(num)}
                                    disabled={!inRange}
                                    className="w-[44px] flex justify-center focus:outline-none shrink-0"
                                    style={{ opacity, transition: "opacity 0.15s", cursor: inRange ? "pointer" : "default" }}
                                >
                                    <SvgText
                                        text={inRange ? String(num) : "0"}
                                        weight="600"
                                        height={isSelected ? 20 : 16}
                                        className={inRange ? "text-[#1e1e1e]" : "text-transparent"}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Proceed button */}
                <button
                    type="button"
                    onClick={() => router.push(`/order/billing-shipping?qty=${quantity}`)}
                    className="bg-[#0000f4] rounded-full px-[40px] py-4.5 mt-[60px] sm:mt-[100px] sm:self-center cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none flex justify-center"
                >
                    <SvgText text="Proceed" weight="600" height={16} className="text-white" />
                </button>
            </div>
        </main>
    );
}
