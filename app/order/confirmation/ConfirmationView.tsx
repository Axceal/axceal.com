"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../../components/SvgText";
import { OrderPlacedIcon } from "../../components/icons/OrderPlacedIcon";
import { AeroIcon } from "../../components/icons/AeroIcon";
import { apiFetch } from "@/lib/http/client";
import type { OrderDetailResponse } from "@/lib/contracts/order";

const SPRING = { type: "spring", stiffness: 280, damping: 28 } as const;
const POLL_INTERVAL_MS = 3000;

function formatINR(paise: number): string {
    const rupees = paise / 100;
    return `INR ${rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function ConfirmationView({ initial }: { initial: OrderDetailResponse }) {
    const [expanded, setExpanded] = useState(false);
    const [status, setStatus] = useState(initial.status);

    useEffect(() => {
        if (status !== "pending") return;
        const interval = setInterval(async () => {
            try {
                const res = await apiFetch(`/api/orders/${initial.id}`);
                if (!res.ok) return;
                const json = await res.json().catch(() => null);
                if (json?.data?.status && json.data.status !== "pending") {
                    setStatus(json.data.status);
                }
            } catch {}
        }, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [status, initial.id]);

    const priceLabel = expanded ? "Price" : "Paid";
    const priceText = formatINR(initial.totalPaise);

    const billing = initial.billingAddressSnapshot;
    const shipping = initial.shippingAddressSnapshot;

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
                            <AeroIcon alt="Aero x1" className="w-[200px]" />
                        </div>

                        {status === "failed" ? (
                            <div className="bg-[#f1f1f1] rounded-[15px] px-5 h-[70px] flex items-center justify-center">
                                <SvgText text="Failed" weight="600" height={18} className="text-[#ff0000]" />
                            </div>
                        ) : status === "pending" ? (
                            <div className="bg-[#f1f1f1] rounded-[15px] px-5 h-[70px] flex items-center justify-center">
                                <SvgText text="Processing payment…" weight="500" height={14} className="text-[#aaaaaa]" />
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
                                <SvgText text={String(initial.quantity)} weight="600" height={20} className="text-[#1e1e1e] self-center" />
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
                                                text={`#${initial.id.slice(0, 8)}`}
                                                weight="600"
                                                height={14}
                                                className="text-[#1e1e1e]"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-5">
                                        <DetailRow label="Transaction ID" value={initial.razorpayPaymentId ?? ""} />
                                        <DetailRow label="Order Status" value={initial.status} />
                                        <DetailRow label="E-Mail Address" value={initial.email} />
                                        <DetailRow
                                            label="Billing Address"
                                            valueLines={[
                                                `${billing.firstName} ${billing.lastName}`,
                                                billing.line1,
                                                `${billing.state}, ${billing.zip}, ${billing.country}`,
                                            ]}
                                        />
                                        {shipping && (
                                            <DetailRow
                                                label="Shipping Address"
                                                valueLines={[
                                                    `${shipping.firstName} ${shipping.lastName}`,
                                                    shipping.line1,
                                                    `${shipping.state}, ${shipping.zip}, ${shipping.country}`,
                                                ]}
                                            />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

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
            <div className={`w-[120px] flex justify-end shrink-0 ${valueLines ? "self-start" : ""}`}>
                <SvgText
                    text={label}
                    weight="600"
                    height={14}
                    className="text-[#aaaaaa] text-right"
                />
            </div>
            <div className="flex-1">
                {valueLines ? (
                    <div className="flex flex-col items-start gap-1 min-h-[14px]">
                        {valueLines.map((line, i) =>
                            line ? (
                                <SvgText
                                    key={i}
                                    text={line}
                                    weight="500"
                                    height={PLACEHOLDER_HEIGHT}
                                    className="text-[#1e1e1e]"
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
                        className="text-[#1e1e1e]"
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
