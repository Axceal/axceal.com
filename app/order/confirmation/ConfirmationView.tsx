"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../../components/text/SvgText";
import { OrderPlacedIcon } from "../../components/icons/account/OrderPlacedIcon";
import { AeroIcon } from "../../components/icons/brand/AeroIcon";
import { LoadingBar } from "../../components/feedback/LoadingBar";
import { Squircle } from "../../components/layout/Squircle";
import { apiFetch } from "@/lib/http/client";
import type { OrderDetailResponse } from "@/lib/contracts/order";
import { elideEmail } from "@/lib/format";
import { DetailRow } from "../../account/orders/components/DetailRow";
import { formatDateOrdinal } from "../../account/orders/utils/formatters";
import { AssistanceModal } from "../../account/orders/components/AssistanceModal";

const SPRING = { type: "spring", stiffness: 280, damping: 28 } as const;
const POLL_INTERVAL_MS = 3000;

function formatINR(paise: number): string {
    const rupees = paise / 100;
    return `INR ${rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// "xxxxxxxxx" → "xxx-xxx-xxx". Strips existing dashes first so it works on
// raw UUID-style ids too. Length defaults to 9 chars (3 groups).
function formatOrderId(id: string, len = 9): string {
    const flat = id.replace(/-/g, "").slice(0, len);
    return flat.match(/.{1,3}/g)?.join("-") ?? flat;
}

export function ConfirmationView({ initial }: { initial: OrderDetailResponse }) {
    const [expanded, setExpanded] = useState(false);
    const [showAssistModal, setShowAssistModal] = useState(false);
    const [status, setStatus] = useState(initial.status);
    const [isDesktop, setIsDesktop] = useState(true);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const mql = window.matchMedia("(min-width: 768px)");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsDesktop(mql.matches);
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, []);

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
            } catch { }
        }, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [status, initial.id]);

    const priceLabel = expanded ? "Price" : "Paid";
    const priceText = formatINR(initial.totalPaise);

    const billing = initial.billingAddressSnapshot;
    const shipping = initial.shippingAddressSnapshot;

    return (
        <>
            <AnimatePresence>
                {showAssistModal && <AssistanceModal onClose={() => setShowAssistModal(false)} />}
            </AnimatePresence>
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
                        <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] w-full h-[320px] md:h-[300px] flex items-center justify-center">
                            <AeroIcon alt="Aero x1" className="w-[200px]" />
                        </Squircle>

                        {status === "failed" ? (
                            <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] px-5 h-[70px] flex items-center justify-center">
                                <SvgText text="Failed" weight="600" height={18} className="text-[#ff0000]" />
                            </Squircle>
                        ) : status === "pending" ? (
                            <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] px-5 h-[70px] flex items-center justify-center">
                                <LoadingBar trackClassName="bg-white" />
                            </Squircle>
                        ) : (
                            <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] px-5 flex h-[70px] items-center justify-between">
                                <SvgText text={priceLabel} weight="500" height={14} className="text-[#aaaaaa]" />
                                <SvgText text={priceText} weight="600" height={18} className="text-[#1e1e1e]" />
                                <SvgText text="Inc. Taxes" weight="500" height={14} className="text-[#aaaaaa]" />
                            </Squircle>
                        )}

                        <div className="flex gap-2 h-[100px]">
                            <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] w-[100px] h-[100px] flex flex-col p-5 shrink-0">
                                <SvgText text="Unit" weight="500" height={14} className="text-[#aaaaaa]" />
                                <div className="flex-1 flex items-center justify-center">
                                    <SvgText text={String(initial.quantity)} weight="600" height={20} className="text-[#1e1e1e]" />
                                </div>
                            </Squircle>
                            <Squircle
                                as={motion.button}
                                borderRadius={15}
                                smoothing={50}
                                onClick={() => setExpanded((e) => !e)}
                                animate={{ backgroundColor: expanded ? "#0000f4" : "#f1f1f1" }}
                                transition={SPRING}
                                className="flex-1 flex items-center justify-center cursor-pointer focus:outline-none focus-visible:outline-none"
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
                            </Squircle>
                        </div>
                    </motion.div>
                </motion.div>

                <Link
                    href="/"
                    className="bg-[#f1f1f1] rounded-full px-2 md:px-[30px] py-4 cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:outline-none flex justify-center w-[160px] md:w-auto mt-6"
                >
                    <SvgText text="Back to Store" weight="600" height={14} className="text-[#0000f4]" />
                </Link>
            </motion.div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
                    >
                        <div className="absolute inset-0 bg-black/40" onClick={() => setExpanded(false)} />
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 300 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 400 }}
                            transition={{ type: "spring", stiffness: 400, damping: 35 }}
                            className="relative z-10 w-[360px] lg:w-[480px] flex flex-col gap-[10px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex lg:hidden w-full">
                                <Squircle as="button" borderRadius={20} smoothing={50} onClick={() => setShowAssistModal(true)} className="bg-[#f1f1f1] w-full h-[75px] flex items-center justify-center cursor-pointer focus:outline-none">
                                    <SvgText text="Request Assistance" weight="600" height={14} className="text-[#0000f4]" />
                                </Squircle>
                            </div>

                            <div className="hidden lg:flex flex-row gap-[10px] w-full">
                                <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] relative w-[100px] shrink-0 h-[100px] flex items-center justify-center">
                                    <div className="absolute top-4 left-4 flex items-center h-[14px]">
                                        <SvgText text="Unit" weight="500" height={14} className="text-[#aaaaaa]" maxWidth={Infinity} />
                                    </div>
                                    <SvgText text={String(initial.quantity)} weight="600" height={20} className="text-[#1e1e1e]" />
                                </Squircle>
                                <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] relative w-[180px] shrink-0 h-[100px] flex items-center justify-center">
                                    <div className="absolute top-4 left-4 flex items-center h-[14px]">
                                        <SvgText text="On" weight="500" height={14} className="text-[#aaaaaa]" maxWidth={Infinity} />
                                    </div>
                                    <SvgText text={formatDateOrdinal(initial.createdAt)} weight="600" height={16} className="text-[#1e1e1e]" />
                                </Squircle>
                                <Squircle as="button" borderRadius={15} smoothing={50} onClick={() => setShowAssistModal(true)} className="bg-[#f1f1f1] w-[180px] shrink-0 h-[100px] flex items-center justify-center cursor-pointer focus:outline-none">
                                    <SvgText text="Request Assistance" weight="600" height={14} className="text-[#0000f4]" />
                                </Squircle>
                            </div>

                            <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] px-6 py-[30px] lg:p-7 w-full">
                                <div className="flex items-center justify-between mb-8 gap-[15px] md:gap-6">
                                    <div className="w-[75px] md:w-[120px] flex justify-end shrink-0">
                                        <SvgText text="Order Details" weight="600" height={14} className="text-[#aaaaaa] text-right" />
                                    </div>
                                    <div className="flex-1 flex flex-col items-center gap-1 shrink-0">
                                        <SvgText text="Order Id" weight="600" height={12} className="text-[#1e1e1e]" maxWidth={Infinity} />
                                        <SvgText text={`#${formatOrderId(initial.id)}`} weight="600" height={12} className="text-[#1e1e1e]" maxWidth={Infinity} />
                                    </div>
                                    <div className="flex justify-end shrink-0 pr-3">
                                        <button type="button" onClick={() => setExpanded(false)} className="focus:outline-none cursor-pointer shrink-0">
                                            <SvgText text="Show less" weight="600" height={14} className="text-[#0000f4]" maxWidth={Infinity} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-5">
                                    <DetailRow label="Transaction ID" value={initial.razorpayPaymentId ?? ""} />
                                    <DetailRow label="Order Status" value={initial.status} />
                                    <DetailRow label="E-Mail Address" value={elideEmail(initial.email)} />
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
                            </Squircle>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
        </>
    );
}
