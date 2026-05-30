// Network glue for /create-account. Splitting these out keeps
// useCreateAccountForm focused on UI state and validation. None of these
// routes are CSRF-gated (they live under /api/auth/*), so plain fetch is fine
// — see middleware.ts CSRF_EXEMPT.

type Json = Record<string, unknown> | null;

async function postJson(url: string, body: unknown): Promise<{ res: Response; body: Json }> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    const json: Json = await res.json().catch(() => null);
    return { res, body: json };
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

function fail<T>(b: Json, fallback: string): ApiResult<T> {
    const err = b && typeof b === "object" ? (b as { error?: { message?: string } }).error : undefined;
    return { ok: false, message: err?.message ?? fallback };
}

export async function apiSendRegisterOtp(email: string): Promise<ApiResult<{ sent: true }>> {
    try {
        const { res, body } = await postJson("/api/auth/send-otp", { email, flow: "register" });
        if (!res.ok || !(body as { ok?: boolean })?.ok) return fail(body, "Could not send Code. Please try again.");
        return { ok: true, data: { sent: true } };
    } catch {
        return { ok: false, message: "Network error. Please try again." };
    }
}

export async function apiVerifyOtp(email: string, otp: string): Promise<ApiResult<{ otpToken: string; accountExists: boolean }>> {
    try {
        const { res, body } = await postJson("/api/auth/verify-otp", { email, otp });
        if (!res.ok || !(body as { ok?: boolean })?.ok) return fail(body, "Invalid Code.");
        const data = (body as { data: { otpToken: string; accountExists: boolean } }).data;
        return { ok: true, data };
    } catch {
        return { ok: false, message: "Network error verifying Code." };
    }
}

export async function apiOtpLogin(email: string, otpToken: string): Promise<ApiResult<{ pendingMfaToken: string }>> {
    try {
        const { res, body } = await postJson("/api/auth/otp-login", { email, otpToken });
        if (!res.ok || !(body as { ok?: boolean })?.ok) return fail(body, "Could not sign you in. Please request a new Code.");
        return { ok: true, data: (body as { data: { pendingMfaToken: string } }).data };
    } catch {
        return { ok: false, message: "Network error. Please try again." };
    }
}

export async function apiRegister(email: string, password: string, otpToken: string): Promise<ApiResult<{ signupSessionToken: string }>> {
    try {
        const { res, body } = await postJson("/api/auth/register", { email, password, otpToken });
        if (!res.ok || !(body as { ok?: boolean })?.ok) return fail(body, "Could not create account.");
        return { ok: true, data: (body as { data: { signupSessionToken: string } }).data };
    } catch {
        return { ok: false, message: "Network error. Please try again." };
    }
}

// Mirror of lib/contracts/common.ts Password schema — applied client-side so
// the UI can react before round-trips. Server still enforces independently.
export function checkPasswordComplexity(password: string) {
    const isLengthValid = password.length >= 8 && password.length <= 64;
    const hasSpecialChar = /[^\sa-zA-Z0-9]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    return {
        isLengthValid,
        hasSpecialChar,
        hasUpper,
        hasDigit,
        passwordValid: isLengthValid && hasSpecialChar && hasUpper && hasDigit,
        hasAnyConstraint: !isLengthValid || !hasSpecialChar || !hasUpper || !hasDigit,
    };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
