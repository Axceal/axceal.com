import type { ErrorCode } from "@/lib/http/errors";

export const ok = <T>(data: T, init?: ResponseInit) =>
  Response.json({ ok: true, data }, init);

export const fail = (
  code: ErrorCode,
  message: string,
  status: number,
  details?: unknown,
) => Response.json({ ok: false, error: { code, message, details } }, { status });
