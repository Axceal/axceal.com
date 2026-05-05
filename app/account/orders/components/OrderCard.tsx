"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../../../components/SvgText";
import { AssistanceModal } from "./AssistanceModal";
import { DetailRow } from "./DetailRow";
import {
    formatDateOrdinal,
    formatPrice,
    formatAddressLines,
    formatOrderRef,
    formatPhone,
} from "../utils/formatters";
import type { OrderListResponse } from "@/lib/contracts/order";
import type { Address } from "@/lib/contracts/address";

type Order = OrderListResponse[number];

type OrderDetail = {
    razorpayPaymentId: string | null;
    email: string;
    billingAddressSnapshot: Address;
    shippingAddressSnapshot: Address | null;
};

const SPRING = { type: "spring", stiffness: 280, damping: 28 } as const;

// ── Desktop info cards (Unit + Request Assistance + Date) ──────────────────
function OrderCardDesktop({ order, onRequestAssistance }: { order: Order; onRequestAssistance: () => void }) {
    return (
        <div className="hidden lg:flex flex-col gap-[10px]">
            <div className="flex gap-[10px]">
                <div className="bg-[#f1f1f1] rounded-[15px] w-[100px] h-[100px] shrink-0 flex flex-col px-4 py-4 gap-1">
                    <SvgText text="Unit" weight="500" height={14} className="text-[#aaaaaa]" />
                    <SvgText text={String(order.quantity)} weight="600" height={20} className="text-[#1e1e1e] my-3 self-center" />
                </div>
                {order.status !== "failed" && (
                    <button
                        type="button"
                        onClick={onRequestAssistance}
                        className="bg-[#f1f1f1] rounded-[15px] flex-1 flex items-center justify-center cursor-pointer focus:outline-none focus-visible:outline-none"
                    >
                        <SvgText text="Request Assistance" weight="600" height={14} className="text-[#0000f4]" />
                    </button>
                )}
            </div>
            <div className="bg-[#f1f1f1] rounded-[15px] w-[200px] h-[100px] px-5 py-5 flex flex-col gap-2">
                <SvgText text="On" weight="500" height={14} className="text-[#aaaaaa]" />
                <SvgText text={formatDateOrdinal(order.createdAt)} weight="600" height={18} className="text-[#1e1e1e] self-center my-2" />
            </div>
        </div>
    );
}

// ── Mobile info cards (Date + Unit + Request Assistance) ───────────────────
function OrderCardMobile({ order, onRequestAssistance }: { order: Order; onRequestAssistance: () => void }) {
    return (
        <div className="flex lg:hidden flex-col w-[320px] gap-[10px]">
            <div className="flex gap-[10px]">
                <div className="bg-[#f1f1f1] rounded-[15px] flex-1 h-[100px] px-5 py-5 flex flex-col gap-2">
                    <SvgText text="On" weight="500" height={14} className="text-[#aaaaaa]" />
                    <SvgText text={formatDateOrdinal(order.createdAt)} weight="600" height={16} className="text-[#1e1e1e] self-center my-2" />
                </div>
                <div className="bg-[#f1f1f1] rounded-[15px] w-[100px] h-[100px] shrink-0 flex flex-col px-4 py-4 gap-1">
                    <SvgText text="Unit" weight="500" height={14} className="text-[#aaaaaa]" />
                    <SvgText text={String(order.quantity)} weight="600" height={20} className="text-[#1e1e1e] my-3 self-center" />
                </div>
            </div>
            {order.status !== "failed" && (
                <button
                    type="button"
                    onClick={onRequestAssistance}
                    className="bg-[#f1f1f1] rounded-[15px] w-full h-[70px] flex items-center justify-center cursor-pointer focus:outline-none focus-visible:outline-none"
                >
                    <SvgText text="Request Assistance" weight="600" height={14} className="text-[#0000f4]" />
                </button>
            )}
        </div>
    );
}

// ── OrderCard ──────────────────────────────────────────────────────────────
export function OrderCard({ order, orderNumber }: { order: Order; orderNumber: number }) {
    const [expanded, setExpanded] = useState(false);
    const [detail, setDetail] = useState<OrderDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [showAssistModal, setShowAssistModal] = useState(false);

    function toggleExpand() {
        if (!expanded && !detail && !loadingDetail) {
            setLoadingDetail(true);
            fetch(`/api/orders/${order.id}`)
                .then((r) => r.json())
                .then((body) => {
                    if (body.ok) setDetail(body.data);
                    else setDetailError(body.error?.message ?? "Failed to load details");
                })
                .catch(() => setDetailError("Network error"))
                .finally(() => setLoadingDetail(false));
        }
        setExpanded((e) => !e);
    }

    const priceLabel = order.status === "paid" ? "Paid" : "Price";

    return (
        <>
            {showAssistModal && <AssistanceModal onClose={() => setShowAssistModal(false)} />}
            <div className="flex flex-col gap-[10px] w-full lg:w-fit max-w-[500px] lg:max-w-none mx-auto lg:mx-0 items-center lg:items-start">
                <div className="flex flex-col w-[320px] lg:w-auto lg:flex-row gap-[10px]">
                    {/* Left column: Order Number label + image card */}
                    <div className="flex flex-col w-full lg:w-[300px] shrink-0">
                        <div className="h-[30px] flex items-center justify-center mb-3">
                            <SvgText
                                text={`Order Number ${orderNumber}`}
                                weight="500"
                                height={14}
                                className="text-[#aaaaaa]"
                            />
                        </div>
                        <div className="bg-[#f1f1f1] rounded-[20px] h-[320px] lg:h-auto lg:flex-1 flex items-center justify-center">
                            <img src="/assests/aero svg.svg" alt="Aero" className="w-[200px]" />
                        </div>
                    </div>

                    {/* Right column: info cards */}
                    <div className="flex flex-col gap-[10px] w-full lg:w-[300px] shrink-0 lg:pt-[42px]">
                        {/* Price / Failed status */}
                        {order.status === "failed" ? (
                            <div className="bg-[#f1f1f1] rounded-[15px] px-5 h-[70px] flex items-center justify-center">
                                <SvgText text="Failed" weight="600" height={18} className="text-[#ff0000]" />
                            </div>
                        ) : (
                            <div className="bg-[#f1f1f1] rounded-[15px] px-5 flex h-[70px] items-center justify-between">
                                <SvgText text={priceLabel} weight="500" height={14} className="text-[#aaaaaa]" />
                                <SvgText text={formatPrice(order.totalPaise)} weight="600" height={18} className="text-[#1e1e1e]" />
                                <SvgText text="Inc. Taxes" weight="500" height={14} className="text-[#aaaaaa]" />
                            </div>
                        )}

                        <OrderCardDesktop order={order} onRequestAssistance={() => setShowAssistModal(true)} />
                        <OrderCardMobile order={order} onRequestAssistance={() => setShowAssistModal(true)} />
                    </div>
                </div>

                {/* Order Details bar — spans full width of both columns */}
                {order.status === "failed" ? (
                    <div className="bg-[#f1f1f1] rounded-[20px] px-8 py-[30px] flex items-center justify-center w-[320px] h-[100px] lg:h-auto lg:w-[510px]">
                        <button
                            type="button"
                            onClick={toggleExpand}
                            className="focus:outline-none focus-visible:outline-none cursor-pointer"
                        >
                            {loadingDetail ? (
                                <SvgText text="Loading…" weight="500" height={14} className="text-[#aaaaaa]" />
                            ) : (
                                <SvgText
                                    text={expanded ? "Show less" : "See details or take action"}
                                    weight="600"
                                    height={14}
                                    className="text-[#0000f4]"
                                />
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="bg-[#f1f1f1] rounded-[20px] p-6 lg:px-8 lg:py-[30px] h-[100px] lg:h-auto w-[320px] lg:w-[510px] flex flex-row items-center justify-between">
                        <div className="hidden lg:block lg:flex-1">
                            <SvgText text="Order Details" weight="500" height={14} className="text-[#aaaaaa]" />
                        </div>
                        <div className="flex flex-col items-start lg:items-center gap-1 lg:flex-1">
                            <SvgText text="Order Id" weight="600" height={14} className="text-[#1e1e1e]" />
                            <SvgText text={`#${formatOrderRef(order.id)}`} weight="600" height={14} className="text-[#1e1e1e]" />
                        </div>
                        <div className="flex-1 flex justify-end">
                            <button
                                type="button"
                                onClick={toggleExpand}
                                className="focus:outline-none focus-visible:outline-none cursor-pointer"
                            >
                                {loadingDetail ? (
                                    <SvgText text="Loading…" weight="500" height={14} className="text-[#aaaaaa]" />
                                ) : (
                                    <SvgText
                                        text={expanded ? "Show less" : "See Details"}
                                        weight="600"
                                        height={14}
                                        className="text-[#0000f4]"
                                    />
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Expanded details panel */}
                <AnimatePresence initial={false}>
                    {expanded && (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={SPRING}
                            className="overflow-hidden w-[320px] lg:w-[510px]"
                        >
                            <div className="bg-[#f1f1f1] rounded-[20px] p-7 ">
                                {detailError ? (
                                    <SvgText text={detailError} weight="500" height={13} className="text-[#e53e3e]" />
                                ) : detail ? (
                                    <div className="flex flex-col gap-5">
                                        <DetailRow label="Payment Method" value="Razorpay" />
                                        <DetailRow label="Transaction ID" value={detail.razorpayPaymentId ?? "—"} />
                                        <DetailRow label="Order Status" value="In-Transit" />
                                        <DetailRow label="E-Mail Address" value={detail.email} />
                                        <DetailRow label="Billing Address" valueLines={formatAddressLines(detail.billingAddressSnapshot)} />
                                        <DetailRow
                                            label="Shipping Address"
                                            valueLines={formatAddressLines(detail.shippingAddressSnapshot ?? detail.billingAddressSnapshot)}
                                        />
                                        <DetailRow label="Payer's Phone" value={formatPhone(detail.billingAddressSnapshot)} />
                                        <DetailRow
                                            label="Receiver's Phone"
                                            value={formatPhone(detail.shippingAddressSnapshot ?? detail.billingAddressSnapshot)}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
