"use client";
import Link from "next/link";
import { SvgText } from "../../../components/SvgText";
import { RightArrow } from "../../../components/icons/RightArrow";

export default function PaymentFailedPage() {
    return (
        <main className="flex-1 flex flex-col pt-8 items-center">

            {/* ── Content column — breadcrumb + title + card + price all left-aligned together ── */}
            <div className="flex flex-col items-center">

                {/* Breadcrumb + title + card + price share same left edge */}
                <div className="flex flex-col gap-4 items-start mb-14">
                    <Link href="/order/payment" className="flex items-center gap-3 w-fit mb-4">
                        <RightArrow className="text-[#0000f4]" />
                        <SvgText text="Retrying Payment" weight="600" height={16} className="text-[#0000f4]" />
                    </Link>
                    <SvgText text="Payment Failed" weight="600" height={18} className="text-[#f42400] mt-[20px]" />

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
                <div className="flex flex-col items-center gap-1 w-[680px] mt-[10px] text-center">
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
                    className="bg-[#0000f4] rounded-full px-[50px] mt-[30px] py-4.5 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none flex justify-center"
                >
                    <SvgText text="Pay" weight="600" height={16} className="text-white" />
                </button>
            </div>
        </main>
    );
}
