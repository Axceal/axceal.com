import { apiFetch } from "@/lib/http/client";
import type { AddressPayload } from "./types";

export type ValidateResult = {
    valid: boolean;
    error?: string;
    corrections?: { zip?: string; state?: string };
};

export async function validateAddressApi(
    addr: AddressPayload,
    countryCode: string,
): Promise<ValidateResult> {
    const res = await apiFetch("/api/validate-address", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            line1: addr.line1,
            state: addr.state,
            zip: addr.zip,
            countryCode,
        }),
    });
    return res.json();
}

export async function createOrderApi(args: {
    quantity: number;
    billing: AddressPayload;
    shipping: AddressPayload;
    idempotencyKey: string;
}): Promise<{ ok: true; orderId: string } | { ok: false; message: string }> {
    try {
        const res = await apiFetch("/api/orders", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                quantity: args.quantity,
                billingAddress: args.billing,
                shippingAddress: args.shipping,
                idempotencyKey: args.idempotencyKey,
            }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.ok) {
            return {
                ok: false,
                message: body?.error?.message ?? "Could not place order. Please check your details and try again.",
            };
        }
        return { ok: true, orderId: body.data.id as string };
    } catch {
        return { ok: false, message: "Network error. Please try again." };
    }
}
