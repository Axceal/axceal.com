"use client";
import Link from "next/link";
import { SvgText } from "../../components/SvgText";
import { Squircle } from "@/app/components/Squircle";

// Placeholder order type for future use
interface Order {
    id: string;
    product: string;
    date: string;
    status: string;
}

const orders: Order[] = []; // empty → shows empty state

export default function OrdersPage() {
    return (
        <main className="flex-1 flex flex-col px-30 py-8 gap-6">
            {/* Back */}
            <Link href="/account" id="orders-back-btn" className="flex items-center gap-1 w-fit">
                <SvgText text="Back" weight="600" height={16} className="text-[#1e1e1e]" />
            </Link>

            {/* Layout: sidebar + content */}
            <div className="flex gap-[10px] items-start">

                {/* Orders sidebar tab — selected (blue) */}
                <Squircle borderRadius={24} smoothing={100} className="bg-[#0000f4] w-[300px] h-[100px]">
                    <div className="w-full h-full flex items-center justify-center">
                        <SvgText text="Orders" weight="600" height={18} className="text-white" />
                    </div>
                </Squircle>

                {/* Content area */}
                <div className="flex-1 flex items-center h-[200px] w-fit px-8">
                    {orders.length === 0 ? (
                        <SvgText
                            text="No Orders made yet"
                            weight="500"
                            height={16}
                            className="text-[#aaaaaa]"
                        />
                    ) : (
                        <div className="flex flex-col gap-4 w-full">
                            {orders.map((order) => (
                                <div
                                    key={order.id}
                                    className="bg-[#f1f1f1] rounded-[20px] px-6 py-5 flex items-center justify-between"
                                >
                                    <div className="flex flex-col gap-1">
                                        <SvgText text={order.product} weight="600" height={16} className="text-[#1e1e1e]" />
                                        <SvgText text={order.date} weight="500" height={13} className="text-[#aaaaaa]" />
                                    </div>
                                    <SvgText text={order.status} weight="600" height={14} className="text-[#0000f4]" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}