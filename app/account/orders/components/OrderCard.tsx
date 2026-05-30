"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SvgText } from "../../../components/text/SvgText";
import { AssistanceModal } from "./AssistanceModal";
import { DetailRow } from "./DetailRow";
import {
    formatDateOrdinal,
    formatPrice,
    formatAddressLines,
    formatOrderRef,
    formatPhone,
} from "../utils/formatters";
import { AeroIcon } from "../../../components/icons/brand/AeroIcon";
import { LoadingBar } from "../../../components/feedback/LoadingBar";
import { Squircle } from "../../../components/layout/Squircle";
import type { OrderListResponse } from "@/lib/contracts/order";
import type { Address } from "@/lib/contracts/address";
import { elideEmail } from "@/lib/format";

type Order = OrderListResponse[number];

type OrderDetail = {
    razorpayPaymentId: string | null;
    email: string;
    billingAddressSnapshot: Address;
    shippingAddressSnapshot: Address | null;
};

const ChevronDown = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 text-[#0000f4]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

// ── OrderDetailsModal ────────────────────────────────────────────────────────
function OrderDetailsModal({
    order,
    detail,
    detailError,
    onClose,
    onRequestAssistance
}: {
    order: Order;
    detail: OrderDetail | null;
    detailError: string | null;
    onClose: () => void;
    onRequestAssistance: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
        >
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/40"
            />
            <motion.div
                layout
                initial={{ opacity: 0, y: 300 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 400 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="relative z-10 w-[360px] lg:w-[480px] flex flex-col gap-[10px]"
            >
                {/* Request Assistance (Mobile) */}
                <div className="flex lg:hidden w-full">
                    <Squircle as="button" borderRadius={20} smoothing={50} onClick={onRequestAssistance} className="bg-[#f1f1f1] w-full h-[75px] flex items-center justify-center cursor-pointer focus:outline-none">
                        <SvgText text="Request Assistance" weight="600" height={14} className="text-[#0000f4]" />
                    </Squircle>
                </div>

                {/* 1st Row Options (Desktop) */}
                <div className="hidden lg:flex flex-row gap-[10px] w-full">
                    <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] relative w-[100px] shrink-0 h-[100px] flex items-center justify-center">
                        <div className="absolute top-4 left-4 flex items-center h-[14px]">
                            <SvgText text="Unit" weight="500" height={14} className="text-[#aaaaaa]" maxWidth={Infinity} />
                        </div>
                        <SvgText text={String(order.quantity)} weight="600" height={20} className="text-[#1e1e1e]" />
                    </Squircle>
                    <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] relative w-[180px] shrink-0 h-[100px] flex items-center justify-center">
                        <div className="absolute top-4 left-4 flex items-center h-[14px]">
                            <SvgText text="On" weight="500" height={14} className="text-[#aaaaaa]" maxWidth={Infinity} />
                        </div>
                        <SvgText text={formatDateOrdinal(order.createdAt)} weight="600" height={16} className="text-[#1e1e1e]" />
                    </Squircle>
                    <Squircle as="button" borderRadius={15} smoothing={50} onClick={onRequestAssistance} className="bg-[#f1f1f1] w-[180px] shrink-0 h-[100px] flex items-center justify-center cursor-pointer focus:outline-none">
                        <SvgText text="Request Assistance" weight="600" height={14} className="text-[#0000f4]" />
                    </Squircle>
                </div>

                <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] px-6 py-[30px] lg:p-7 w-full">
                    {/* Header: Order Details, Order Id, Show less */}
                    <div className="flex items-center justify-between mb-8 gap-[15px] md:gap-6">
                        <div className="w-[75px] md:w-[120px] flex justify-end shrink-0">
                            <SvgText text="Order Details" weight="600" height={14} className="text-[#aaaaaa] text-right" />
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1 shrink-0">
                            <SvgText text="Order Id" weight="600" height={12} className="text-[#1e1e1e]" maxWidth={Infinity} />
                            <SvgText text={`#${formatOrderRef(order.id)}`} weight="600" height={12} className="text-[#1e1e1e]" maxWidth={Infinity} />
                        </div>
                        <div className="flex justify-end shrink-0 pr-3">
                            <button type="button" onClick={onClose} className="focus:outline-none cursor-pointer shrink-0">
                                <SvgText text="Show less" weight="600" height={14} className="text-[#0000f4]" maxWidth={Infinity} />
                            </button>
                        </div>
                    </div>

                    {detailError ? (
                        <div className="flex justify-center py-4">
                            <SvgText text={detailError} weight="500" height={14} className="text-[#e53e3e]" />
                        </div>
                    ) : detail ? (
                        <div className="flex flex-col gap-5">
                            <DetailRow label="Payment Method" value="Razorpay" />
                            <DetailRow label="Transaction ID" value={detail.razorpayPaymentId ?? "—"} />
                            <DetailRow label="Order Status" value="In-Transit" />
                            <DetailRow label="E-Mail Address" value={elideEmail(detail.email)} />
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
                    ) : (
                        <div className="flex items-center justify-center py-10">
                            <LoadingBar trackClassName="bg-[#0000f4]" />
                        </div>
                    )}
                </Squircle>
            </motion.div>
        </motion.div>
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
        setExpanded(true);
    }

    const priceLabel = order.status === "paid" ? "Paid" : "Price";

    return (
        <>
            <AnimatePresence>
                {showAssistModal && <AssistanceModal onClose={() => setShowAssistModal(false)} />}
            </AnimatePresence>

            <AnimatePresence>
                {expanded && (
                    <OrderDetailsModal
                        order={order}
                        detail={detail}
                        detailError={detailError}
                        onClose={() => setExpanded(false)}
                        onRequestAssistance={() => {
                            setExpanded(false);
                            setShowAssistModal(true);
                        }}
                    />
                )}
            </AnimatePresence>

            <div className="flex flex-col gap-[10px] w-[320px] lg:w-[300px] items-center lg:items-start mx-auto lg:mx-0">
                <div className="flex flex-col w-full gap-[10px]">
                    {/* Order Number label */}
                    <div className="h-[30px] flex items-center justify-center lg:justify-center mb-2">
                        <SvgText
                            text={`Order Number ${orderNumber}`}
                            weight="500"
                            height={14}
                            className="text-[#aaaaaa]"
                        />
                    </div>

                    {/* Image card */}
                    <Squircle borderRadius={20} smoothing={50} className="bg-[#f1f1f1] h-[320px] lg:h-[300px] w-full flex items-center justify-center">
                        <AeroIcon alt="Aero" className="w-[200px]" />
                    </Squircle>

                    {/* Price / Failed status */}
                    {order.status === "failed" ? (
                        <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] px-5 h-[70px] flex items-center justify-center">
                            <SvgText text="Failed" weight="600" height={16} className="text-[#ff0000]" />
                        </Squircle>
                    ) : (
                        <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] px-6 flex h-[70px] items-center justify-between">
                            <SvgText text={priceLabel} weight="500" height={14} className="text-[#aaaaaa]" />
                            <SvgText text={formatPrice(order.totalPaise)} weight="600" height={18} className="text-[#1e1e1e]" />
                            <SvgText text="Inc. Taxes" weight="500" height={12} className="text-[#aaaaaa]" />
                        </Squircle>
                    )}

                    {/* Unit and Date side-by-side */}
                    <div className="flex flex-row gap-[10px] w-full">
                        <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] relative w-[100px] shrink-0 h-[100px] flex items-center justify-center">
                            <div className="absolute top-4 left-4 flex items-center h-[14px]">
                                <SvgText text="Unit" weight="500" height={14} className="text-[#aaaaaa]" maxWidth={Infinity} />
                            </div>
                            <SvgText text={String(order.quantity)} weight="600" height={20} className="text-[#1e1e1e]" />
                        </Squircle>
                        <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] relative flex-1 h-[100px] flex items-center justify-center">
                            <div className="absolute top-4 left-4 flex items-center h-[14px]">
                                <SvgText text="On" weight="500" height={14} className="text-[#aaaaaa]" maxWidth={Infinity} />
                            </div>
                            <SvgText text={formatDateOrdinal(order.createdAt)} weight="600" height={16} className="text-[#1e1e1e]" />
                        </Squircle>
                    </div>

                    {/* Request Assistance */}
                    {order.status !== "failed" && (
                        <Squircle as="button" borderRadius={15} smoothing={50} onClick={() => setShowAssistModal(true)} className="bg-[#f1f1f1] w-full h-[70px] flex items-center justify-center cursor-pointer focus:outline-none">
                            <SvgText text="Request Assistance" weight="600" height={14} className="text-[#0000f4]" />
                        </Squircle>
                    )}

                    {/* Order Id and See Details */}
                    {order.status === "failed" ? (
                        <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] px-8 flex items-center justify-center w-full h-[80px]">
                            <button type="button" onClick={toggleExpand} className="focus:outline-none cursor-pointer shrink-0">
                                {loadingDetail ? (
                                    <SvgText text="Loading…" weight="500" height={14} className="text-[#aaaaaa]" maxWidth={Infinity} />
                                ) : (
                                    <SvgText text="See details or take action" weight="600" height={14} className="text-[#0000f4]" maxWidth={Infinity} />
                                )}
                            </button>
                        </Squircle>
                    ) : (
                        <Squircle borderRadius={15} smoothing={50} className="bg-[#f1f1f1] px-6 h-[80px] w-full flex flex-row items-center justify-between">
                            <div className="flex flex-col items-start gap-1 shrink-0">
                                <SvgText text="Order Id" weight="600" height={14} className="text-[#1e1e1e]" maxWidth={Infinity} />
                                <SvgText text={`#${formatOrderRef(order.id)}`} weight="600" height={14} className="text-[#1e1e1e]" maxWidth={Infinity} />
                            </div>
                            <button
                                type="button"
                                onClick={toggleExpand}
                                className="focus:outline-none cursor-pointer shrink-0"
                            >
                                {loadingDetail ? (
                                    <SvgText text="Loading…" weight="500" height={14} className="text-[#aaaaaa]" maxWidth={Infinity} />
                                ) : (
                                    <SvgText text="See Details" weight="600" height={14} className="text-[#0000f4]" maxWidth={Infinity} />
                                )}
                            </button>
                        </Squircle>
                    )}
                </div>
            </div>
        </>
    );
}
