import type { ErrorCode } from "@/lib/http/errors";

// Codebase-review item 11 — request-id propagation. `withHandler` threads its
// generated reqId through these helpers so every response carries an
// `x-request-id` header. Clients see it on the wire; logs already index by
// reqId. Wires cross-system correlation (browser console → server log →
// Axiom) without an additional library.
const REQ_ID_HEADER = "x-request-id";

function withReqId(init: ResponseInit | undefined, reqId: string | undefined): ResponseInit {
  if (!reqId) return init ?? {};
  const headers = new Headers(init?.headers);
  if (!headers.has(REQ_ID_HEADER)) headers.set(REQ_ID_HEADER, reqId);
  return { ...init, headers };
}

export const ok = <T>(data: T, init?: ResponseInit, reqId?: string) =>
  Response.json({ ok: true, data }, withReqId(init, reqId));

export const fail = (
  code: ErrorCode,
  message: string,
  status: number,
  details?: unknown,
  reqId?: string,
) =>
  Response.json(
    { ok: false, error: { code, message, details } },
    withReqId({ status }, reqId),
  );
