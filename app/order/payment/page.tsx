"use client";
import { SvgText } from "../../components/SvgText";
import { RightArrow } from "../../components/icons/RightArrow";

const STEPS = [
    { label: "Credentials", active: true },
    { label: "Order", active: true },
    { label: "Billing & Shipping", active: true },
    { label: "Payment", active: true },
];

export default function PaymentPage() {
    return (
        <main className="flex-1 flex flex-col items-center pt-8">

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
            <div className="flex flex-col items-center">

                {/* Title + card + price — left-aligned together */}
                <div className="flex flex-col gap-4 items-start">
                    <SvgText text="Payment" weight="600" height={18} className="text-[#1e1e1e]" />

                    {/* Product card — centered; X  1 floats right without shifting center */}
                    <div className="relative w-[280px] h-[260px]">
                        <div className="bg-[#f1f1f1] rounded-[20px] w-full h-full flex items-center justify-center">
                            <img src="/assests/aero svg.svg" alt="Aero x1" className="w-[200px]" />
                        </div>
                        <div className="absolute top-1/2 -translate-y-1/2 left-[calc(100%+32px)]">
                            <SvgText text="X  1" weight="600" height={18} className="text-[#1e1e1e]" />
                        </div>
                    </div>

                    {/* Price pill */}
                    <div className="bg-[#f1f1f1] rounded-[15px] px-6 py-[25px] flex items-center justify-between w-[280px]">
                        <SvgText text="Price" weight="500" height={14} className="text-[#aaaaaa]" />
                        <SvgText text="INR 9,999" weight="600" height={18} className="text-[#1e1e1e]" />
                        <SvgText text="Inc. Taxes" weight="500" height={14} className="text-[#aaaaaa]" />
                    </div>
                </div>

                {/* Description */}
                <div className="flex flex-col items-center justify-between gap-1 w-[680px] mt-[60px] text-center">
                    <SvgText
                        text="Clicking on Pay will take you to trusted payment gateway. Choose a payment method of your wish and proceed to pay."
                        weight="500"
                        height={12}
                        className="text-[#1e1e1e]"
                    />
                    <SvgText
                        text="Wait until you land back on Axceal's website after payment for order and transaction status."
                        weight="500"
                        height={12}
                        className="text-[#1e1e1e]"
                    />
                </div>

                {/* Pay button */}
                <button
                    type="button"
                    className="bg-[#0000f4] rounded-full px-[50px] py-4.5 mt-[30px] cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none flex justify-center"
                >
                    <SvgText text="Pay" weight="600" height={16} className="text-white" />
                </button>
            </div>
        </main>
    );
}
