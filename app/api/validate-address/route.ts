export const runtime = "nodejs";

import { z } from "zod";
import { withHandler } from "@/lib/http/handler";
import { rateLimit } from "@/lib/http/rate-limit";
import { getClientIp } from "@/lib/http/request";
import { requireSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const ValidateAddressRequest = z.object({
  line1: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  countryCode: z.string().min(1),
});

const ValidateAddressResponse = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
  corrections: z.object({ zip: z.string().optional(), state: z.string().optional() }).optional(),
});

interface GooglePostalAddress {
  postalCode?: string;
  administrativeArea?: string;
}

interface GoogleApiResponse {
  result?: {
    verdict?: { validationGranularity?: string };
    address?: { postalAddress?: GooglePostalAddress };
  };
  error?: { message: string; code: number };
}

const UNACCEPTABLE_GRANULARITIES = new Set(["OTHER", "ROUTE_AND_PREMISE"]);

export const POST = withHandler({
  input: ValidateAddressRequest,
  output: ValidateAddressResponse,
  handler: async ({ input, req }) => {
    // Auth-gate to stop unauthenticated quota abuse on the paid Google API.
    const session = await requireSession();
    const ip = getClientIp(req);
    await rateLimit(`validate-address:user:${session.userId}`, { limit: 30, windowSec: 3600 });
    await rateLimit(`validate-address:ip:${ip}`, { limit: 30, windowSec: 3600 });

    const apiKey = env.GOOGLE_ADDRESS_VALIDATION_API_KEY;
    if (!apiKey) {
      return { valid: false, error: "Address validation not configured." };
    }

    const { line1, state, zip, countryCode } = input;

    const googlePayload = {
      address: {
        regionCode: countryCode,
        ...(state && { administrativeArea: state }),
        ...(zip && { postalCode: zip }),
        ...(line1 && { addressLines: [line1] }),
      },
    };

    let googleRes: Response;
    try {
      googleRes = await fetch(
        `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(googlePayload),
        }
      );
    } catch {
      return { valid: false, error: "Could not reach address validation service." };
    }

    const data: GoogleApiResponse = await googleRes.json();

    if (data.error) {
      logger.error({ code: data.error.code }, "Google Address Validation API error");
      return { valid: false, error: "Address validation failed." };
    }

    const granularity = data.result?.verdict?.validationGranularity ?? "OTHER";

    if (UNACCEPTABLE_GRANULARITIES.has(granularity) || granularity === "OTHER") {
      return { valid: false, error: "Address could not be verified. Please check the details." };
    }

    const postalAddress = data.result?.address?.postalAddress;
    const corrections: { zip?: string; state?: string } = {};

    if (postalAddress?.postalCode && zip && postalAddress.postalCode !== zip) {
      corrections.zip = postalAddress.postalCode;
    }
    if (postalAddress?.administrativeArea && state && postalAddress.administrativeArea !== state) {
      corrections.state = postalAddress.administrativeArea;
    }

    return {
      valid: true,
      ...(Object.keys(corrections).length > 0 && { corrections }),
    };
  },
});
