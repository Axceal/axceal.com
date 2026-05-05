"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../../components/SvgText";
import { OrderPlacedIcon } from "../../components/icons/OrderPlacedIcon";

const SPRING = { type: "spring", stiffness: 280, damping: 28 } as const;

type OrderView = {
    id: string;
    status: string;
    quantity: number;
    totalPaise: number;
    createdAt: string;
};

function formatINR(paise: number): string {
    const rupees = paise / 100;
    return `INR ${rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function ConfirmationPage() {
    return (
        <Suspense fallback={null}>
            <ConfirmationPageInner />
        </Suspense>
    );
}

function ConfirmationPageInner() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");
    const [order, setOrder] = useState<OrderView | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (!orderId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setErrorMsg("Missing order reference.");
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
                const body = await res.json().catch(() => null);
                if (cancelled) return;
                if (!res.ok || !body?.ok) {
                    setErrorMsg(body?.error?.message ?? "Could not load order.");
                    return;
                }
                setOrder(body.data as OrderView);
            } catch {
                if (!cancelled) setErrorMsg("Network error loading order.");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [orderId]);

    const priceLabel = expanded ? "Price" : "Paid";
    const quantity = order?.quantity ?? 1;
    const priceText = order ? formatINR(order.totalPaise) : "INR —";

    return (
        <main className="flex-1 flex flex-col items-center pt-[20px] pb-[20px]">
            <motion.div layout transition={SPRING} className="flex flex-col items-center gap-5 w-full px-6">
                <motion.div layout="position" transition={SPRING} className="flex flex-col items-center gap-3">
                    <OrderPlacedIcon className="text-[#0000f4]" />
                    <SvgText
                        text="Order Placed"
                        weight="600"
                        height={14}
                        className="text-[#0000f4]"
                    />
                </motion.div>

                <motion.div layout transition={SPRING} className="flex flex-col md:flex-row items-center md:items-stretch gap-5 w-full max-w-[500px] md:max-w-none justify-center">
                    <motion.div layout="position" transition={SPRING} className="flex flex-col justify-between gap-3 w-[320px] md:w-[300px] shrink-0">
                        <div className="bg-[#f1f1f1] rounded-[20px] w-full h-[320px] md:h-[300px] flex items-center justify-center">
                            <img src="/assests/aero svg.svg" alt="Aero x1" className="w-[200px]" />
                        </div>

                        {order?.status === "failed" ? (
                            <div className="bg-[#f1f1f1] rounded-[15px] px-5 h-[70px] flex items-center justify-center">
                                <SvgText text="Failed" weight="600" height={18} className="text-[#ff0000]" />
                            </div>
                        ) : (
                            <div className="bg-[#f1f1f1] rounded-[15px] px-5 flex h-[70px] items-center justify-between">
                                <SvgText text={priceLabel} weight="500" height={14} className="text-[#aaaaaa]" />
                                <SvgText text={priceText} weight="600" height={18} className="text-[#1e1e1e]" />
                                <SvgText text="Inc. Taxes" weight="500" height={14} className="text-[#aaaaaa]" />
                            </div>
                        )}

                        <div className="flex gap-2 h-[100px]">
                            <div className="bg-[#f1f1f1] rounded-[15px] w-[100px] h-[100px] flex flex-col items-center justify-center gap-1 shrink-0">
                                <SvgText text="Unit" weight="500" height={14} className="text-[#aaaaaa] self-start ml-[20px] -mt-[20px] mb-[10px]" />
                                <SvgText text={String(quantity)} weight="600" height={20} className="text-[#1e1e1e] self-center" />
                            </div>
                            <motion.button
                                type="button"
                                onClick={() => setExpanded((e) => !e)}
                                animate={{ backgroundColor: expanded ? "#0000f4" : "#f1f1f1" }}
                                transition={SPRING}
                                className="flex-1 rounded-[15px] flex items-center justify-center cursor-pointer focus:outline-none focus-visible:outline-none"
                                aria-expanded={expanded}
                                aria-controls="order-details-panel"
                            >
                                <motion.div
                                    animate={{ color: expanded ? "#ffffff" : "#0000f4" }}
                                    transition={SPRING}
                                    className="flex items-center justify-center"
                                >
                                    <SvgText text="See Details" weight="600" height={14} className="text-current" />
                                </motion.div>
                            </motion.button>
                        </div>
                    </motion.div>

                    <AnimatePresence initial={false}>
                        {expanded && (
                            <motion.div
                                id="order-details-panel"
                                key="details"
                                initial={{ opacity: 0, x: 40, width: 0 }}
                                animate={{ opacity: 1, x: 0, width: "auto" }}
                                exit={{ opacity: 0, x: 40, width: 0 }}
                                transition={SPRING}
                                className="bg-[#f1f1f1] rounded-[20px] overflow-hidden shrink-0 w-[320px] md:w-auto"
                            >
                                <div className="p-7 w-[320px] md:w-[440px]">
                                    <div className="flex items-start justify-between mb-6">
                                        <SvgText
                                            text="Order Details"
                                            weight="500"
                                            height={14}
                                            className="text-[#aaaaaa]"
                                        />
                                        <div className="flex flex-col items-end gap-1">
                                            <SvgText
                                                text="Order Id"
                                                weight="600"
                                                height={14}
                                                className="text-[#1e1e1e]"
                                            />
                                            <SvgText
                                                text="#xxx-xxx-xxx"
                                                weight="600"
                                                height={14}
                                                className="text-[#1e1e1e]"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-5">
                                        <DetailRow label="Payment Method" value="" />
                                        <DetailRow label="Transaction ID" value="" />
                                        <DetailRow label="Order Status" value="In-Transit" />
                                        <DetailRow label="E-Mail Address" value="" />
                                        <DetailRow
                                            label="Billing Address"
                                            valueLines={["", "", ""]}
                                        />
                                        <DetailRow
                                            label="Shipping Address"
                                            valueLines={["", "", ""]}
                                        />
                                        <DetailRow label="Payer's Phone" value="" />
                                        <DetailRow label="Receiver's Phone" value="" />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {errorMsg && (
                    <div className="w-[600px] text-center">
                        <SvgText
                            text={errorMsg}
                            weight="500"
                            height={12}
                            className="text-[#f42400]"
                        />
                    </div>
                )}

                <Link
                    href="/"
                    className="bg-[#f1f1f1] rounded-full px-2 md:px-[40px] py-4 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none flex justify-center w-[160px] md:w-auto"
                >
                    <SvgText text="Back to Store" weight="600" height={14} className="text-[#0000f4]" />
                </Link>
            </motion.div>
        </main>
    );
}

type DetailRowProps =
    | { label: string; value: string; valueLines?: never }
    | { label: string; value?: never; valueLines: string[] };

function DetailRow({ label, value, valueLines }: DetailRowProps) {
    const PLACEHOLDER_HEIGHT = 14;
    return (
        <div className="flex items-center gap-6">
            {/* Label — fixed width, right-aligned, anchored to top for multi-line rows */}
            <div className={`w-[160px] flex justify-end shrink-0 ${valueLines ? "self-start" : ""}`}>
                <SvgText
                    text={label}
                    weight="600"
                    height={14}
                    className="text-[#1e1e1e] text-right"
                />
            </div>
            {/* Value — left-aligned */}
            <div className="flex-1">
                {valueLines ? (
                    <div className="flex flex-col items-start gap-1 min-h-[13px]">
                        {valueLines.map((line, i) =>
                            line ? (
                                <SvgText
                                    key={i}
                                    text={line}
                                    weight="500"
                                    height={PLACEHOLDER_HEIGHT}
                                    className="text-[#aaaaaa]"
                                />
                            ) : (
                                <span
                                    key={i}
                                    style={{ height: PLACEHOLDER_HEIGHT }}
                                    aria-hidden
                                />
                            ),
                        )}
                    </div>
                ) : value ? (
                    <SvgText
                        text={value}
                        weight="500"
                        height={PLACEHOLDER_HEIGHT}
                        className="text-[#aaaaaa]"
                    />
                ) : (
                    <span
                        style={{ height: PLACEHOLDER_HEIGHT }}
                        aria-hidden
                    />
                )}
            </div>
        </div>
    );
}


