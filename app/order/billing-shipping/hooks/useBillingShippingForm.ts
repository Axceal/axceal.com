"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAddressSide } from "./useAddressSide";
import { validateAddressFields } from "./types";
import { createOrderApi, validateAddressApi, type ValidateResult } from "./submitOrder";
import { sessionKeys, readSessionString, writeSession } from "@/lib/sessionKeys";

// Re-export public types for existing consumers (AddressForm imports from here).
export type { AddressFormState, FieldErrorMap } from "./types";

function readQuantity(raw: string | null): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return 1;
    if (n > 5) return 5;
    return Math.floor(n);
}

export function useBillingShippingForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const billingSide = useAddressSide("b");
    const shippingSide = useAddressSide("s");

    const [correctedFields, setCorrectedFields] = useState<Set<string>>(new Set());
    const [showShipping, setShowShipping] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const idempotencyKeyRef = useRef<string>("");

    // Force re-render on mount + when shipping toggles so the indicator picks
    // up the now-mounted refs' offsetTop/Left values.
    const [, forceUpdate] = useState(0);
    useEffect(() => { forceUpdate(n => n + 1); }, []);
    useEffect(() => { forceUpdate(n => n + 1); }, [showShipping]);

    useEffect(() => {
        let key = readSessionString(sessionKeys.orderIdempotencyKey);
        if (!key) {
            key = crypto.randomUUID();
            writeSession(sessionKeys.orderIdempotencyKey, key);
        }
        idempotencyKeyRef.current = key;
    }, []);

    const quantity = readQuantity(searchParams.get("qty"));

    function applyCorrections(billingRes: ValidateResult, shippingRes: ValidateResult): Set<string> {
        const next = new Set<string>();
        if (billingRes.corrections?.zip) { billingSide.setZip(billingRes.corrections.zip); next.add("bZip"); }
        if (billingRes.corrections?.state) { billingSide.setState(billingRes.corrections.state); next.add("bState"); }
        if (shippingRes.corrections?.zip) { shippingSide.setZip(shippingRes.corrections.zip); next.add("sZip"); }
        if (shippingRes.corrections?.state) { shippingSide.setState(shippingRes.corrections.state); next.add("sState"); }
        return next;
    }

    async function handleProceed() {
        if (submitting) return;
        setErrorMsg(null);

        const billing = billingSide.buildPayload();
        const shipping = showShipping ? shippingSide.buildPayload() : billing;

        const bErrors = validateAddressFields(billing, billingSide.countryCode, "billing");
        const sErrors = showShipping
            ? validateAddressFields(shipping, shippingSide.countryCode, "shipping")
            : {};
        billingSide.setFieldErrors(bErrors);
        shippingSide.setFieldErrors(sErrors);
        if (Object.keys(bErrors).length > 0 || Object.keys(sErrors).length > 0) return;

        setSubmitting(true);
        try {
            const [billingResult, shippingResult] = await Promise.all([
                validateAddressApi(billing, billingSide.countryCode),
                showShipping
                    ? validateAddressApi(shipping, shippingSide.countryCode)
                    : Promise.resolve<ValidateResult>({ valid: true }),
            ]);

            if (!billingResult.valid) {
                billingSide.formState.setZipError("Incorrect pincode/zipcode");
                return;
            }
            if (!shippingResult.valid) {
                shippingSide.formState.setZipError("Incorrect pincode/zipcode");
                return;
            }
            billingSide.formState.setZipError(null);
            shippingSide.formState.setZipError(null);

            const newCorrected = applyCorrections(billingResult, shippingResult);
            if (newCorrected.size > 0) {
                setCorrectedFields(newCorrected);
                setErrorMsg("Address corrected — review highlighted fields and proceed again.");
                return;
            }
            setCorrectedFields(new Set());

            const result = await createOrderApi({
                quantity,
                billing,
                shipping,
                idempotencyKey: idempotencyKeyRef.current,
            });
            if (!result.ok) {
                setErrorMsg(result.message);
                return;
            }
            router.push(`/order/payment?orderId=${result.orderId}`);
        } finally {
            setSubmitting(false);
        }
    }

    return {
        billing: billingSide.formState,
        shipping: shippingSide.formState,
        correctedFields,
        setCorrectedFields,
        showShipping,
        setShowShipping,
        submitting,
        errorMsg,
        handleProceed,
    };
}
