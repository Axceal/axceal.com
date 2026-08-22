"use client";

import Link from "next/link";
import { SvgText } from "../../components/text/SvgText";
import { Squircle } from "@/app/components/layout/Squircle";
import { OrderCard } from "./components/OrderCard";
import type { OrderListResponse } from "@/lib/contracts/order";

type Order = OrderListResponse[number];

export function OrderList({ initial }: { initial: Order[] }) {
    return (
        <main className="flex-1 flex flex-col px-6 lg:px-30 py-10 w-full overflow-x-hidden">
            <div className="flex flex-col gap-[10px] items-start w-full">
                {/* Header row */}
                <div className="relative flex flex-col lg:flex-row lg:items-center w-[320px] lg:w-[300px] self-center pb-6 lg:pb-4 z-10 bg-white">
                    {/* Desktop Back Button */}
                    <Link href="/account" className="hidden lg:flex absolute right-full mr-[30px] top-[22px] whitespace-nowrap">
                        <SvgText text="Back" weight="600" height={16} className="text-[#0000f4] " />
                    </Link>
                    {/* Mobile Back Button */}
                    <div className="flex lg:hidden w-full items-center justify-start mb-5">
                        <Link href="/account" className="flex items-center w-fit shrink-0 whitespace-nowrap">
                            <SvgText text="Back" weight="600" height={16} className="text-[#1e1e1e] " />
                        </Link>
                    </div>

                    <Squircle borderRadius={15} smoothing={60} className="bg-[#0000f4] w-full h-[60px] shrink-0">
                        <div className="w-full h-full flex items-center justify-center">
                            <SvgText text="Orders" weight="600" height={16} className="text-white" />
                        </div>
                    </Squircle>
                </div>

                {/* Orders list */}
                <div className="flex flex-col gap-12 lg:gap-8 w-full max-w-[500px] lg:max-w-[600px] self-center items-center">
                    {initial.length === 0 ? (
                        <div className="mt-[30px]">
                            <SvgText text="No orders made yet" weight="500" height={16} className="text-[#aaaaaa]" />
                        </div>
                    ) : (
                        initial.map((order, index) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                orderNumber={initial.length - index}
                            />
                        ))
                    )}
                </div>
            </div>
        </main>
    );
}
