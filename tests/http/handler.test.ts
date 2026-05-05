import { describe, it, expect } from "vitest";
import { z } from "zod";
import { withHandler } from "@/lib/http/handler";
import { AppError, ErrorCode } from "@/lib/http/errors";

function postReq(body?: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json", ...(headers ?? {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function readJson<T = unknown>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

type OkBody = { ok: true; data: unknown };
type ErrBody = { ok: false; error: { code: string; message: string; details?: unknown } };

describe("http/withHandler", () => {
  it("valid body passes Zod schema, handler called with parsed data → 200", async () => {
    const handler = withHandler({
      input: z.object({ name: z.string() }),
      handler: async ({ input }) => ({ greeting: `hello ${input.name}` }),
    });

    const res = await handler(postReq({ name: "world" }));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect(body.ok).toBe(true);
    expect((body.data as { greeting: string }).greeting).toBe("hello world");
  });

  it("invalid body fails Zod schema → 400 VALIDATION_FAILED with issues in details", async () => {
    const handler = withHandler({
      input: z.object({ age: z.number() }),
      handler: async () => ({}),
    });

    const res = await handler(postReq({ age: "not-a-number" }));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(Array.isArray(body.error.details)).toBe(true);
    expect((body.error.details as unknown[]).length).toBeGreaterThan(0);
  });

  it("missing required field → 400 with field-level error in details", async () => {
    const handler = withHandler({
      input: z.object({ required: z.string() }),
      handler: async () => ({}),
    });

    const res = await handler(postReq({}));
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    const details = body.error.details as Array<{ path: unknown[] }>;
    expect(details.some((d) => d.path.includes("required"))).toBe(true);
  });

  it("body > 64KB (via content-length header) → 413", async () => {
    const handler = withHandler({
      input: z.object({ data: z.string() }),
      handler: async () => ({}),
    });

    const bigPayload = "x".repeat(65 * 1024);
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(bigPayload.length + 100),
      },
      body: JSON.stringify({ data: bigPayload }),
    });
    const res = await handler(req);
    expect(res.status).toBe(413);
  });

  it("handler throws AppError(NOT_FOUND, 404) → 404", async () => {
    const handler = withHandler({
      handler: async () => {
        throw new AppError(ErrorCode.NOT_FOUND, "not found", 404);
      },
    });

    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    expect(res.status).toBe(404);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe(ErrorCode.NOT_FOUND);
    expect(body.error.message).toBe("not found");
  });

  it("handler throws AppError(RATE_LIMITED, 429) → 429", async () => {
    const handler = withHandler({
      handler: async () => {
        throw new AppError(ErrorCode.RATE_LIMITED, "too many requests", 429);
      },
    });

    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    expect(res.status).toBe(429);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe(ErrorCode.RATE_LIMITED);
  });

  it("handler throws AppError(UNAUTHENTICATED, 401) → 401", async () => {
    const handler = withHandler({
      handler: async () => {
        throw new AppError(ErrorCode.UNAUTHENTICATED, "login required", 401);
      },
    });

    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    expect(res.status).toBe(401);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe(ErrorCode.UNAUTHENTICATED);
  });

  it("handler throws AppError(FORBIDDEN, 403) → 403", async () => {
    const handler = withHandler({
      handler: async () => {
        throw new AppError(ErrorCode.FORBIDDEN, "forbidden", 403);
      },
    });

    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    expect(res.status).toBe(403);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
  });

  it("handler throws AppError(INTERNAL, 500) → 500", async () => {
    const handler = withHandler({
      handler: async () => {
        throw new AppError(ErrorCode.INTERNAL, "internal error", 500);
      },
    });

    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    expect(res.status).toBe(500);
  });

  it("handler throws unexpected Error → 500 with generic message, no stack trace leaked", async () => {
    const handler = withHandler({
      handler: async () => {
        throw new Error("secret internal kaboom");
      },
    });

    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    expect(res.status).toBe(500);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe(ErrorCode.INTERNAL);
    expect(body.error.message).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain("kaboom");
  });

  it("withHandler catches async handler rejections (Promise.reject) → 404", async () => {
    const handler = withHandler({
      handler: async () => Promise.reject(new AppError(ErrorCode.NOT_FOUND, "gone", 404)),
    });

    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    expect(res.status).toBe(404);
  });

  it("handler with no input schema ignores body and calls handler successfully", async () => {
    const handler = withHandler({
      handler: async () => ({ pong: true }),
    });

    const res = await handler(postReq({ anything: "ignored" }));
    expect(res.status).toBe(200);
    const body = await readJson<OkBody>(res);
    expect((body.data as { pong: boolean }).pong).toBe(true);
  });

  it("ok response body has shape { ok: true, data: ... }", async () => {
    const handler = withHandler({
      handler: async () => ({ value: 42 }),
    });

    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    const body = await readJson<OkBody>(res);
    expect(body.ok).toBe(true);
    expect((body.data as { value: number }).value).toBe(42);
  });

  it("error response body has shape { ok: false, error: { code, message } }", async () => {
    const handler = withHandler({
      handler: async () => {
        throw new AppError(ErrorCode.NOT_FOUND, "missing", 404);
      },
    });

    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    const body = await readJson<{ ok: false; error: { code: string; message: string } }>(res);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBeTruthy();
    expect(body.error.message).toBeTruthy();
  });

  // G.1 — remaining AppError status codes
  it("handler throws AppError(CONFLICT, 409) → 409", async () => {
    const handler = withHandler({
      handler: async () => {
        throw new AppError(ErrorCode.EMAIL_EXISTS, "email exists", 409);
      },
    });
    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    expect(res.status).toBe(409);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe(ErrorCode.EMAIL_EXISTS);
  });

  it("handler throws AppError(UNPROCESSABLE, 422) → 422", async () => {
    const handler = withHandler({
      handler: async () => {
        throw new AppError(ErrorCode.UNPROCESSABLE, "cannot process", 422);
      },
    });
    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    expect(res.status).toBe(422);
  });

  it("handler throws AppError(UPSTREAM_FAILED, 502) → 502", async () => {
    const handler = withHandler({
      handler: async () => {
        throw new AppError(ErrorCode.UPSTREAM_FAILED, "upstream failed", 502);
      },
    });
    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    expect(res.status).toBe(502);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe(ErrorCode.UPSTREAM_FAILED);
  });

  it("output schema mismatch in non-prod env → 500 INTERNAL", async () => {
    const handler = withHandler({
      output: z.object({ required: z.string() }),
      handler: async () => ({ required: 123 } as unknown as { required: string }),
    });
    const res = await handler(new Request("http://localhost/api/test", { method: "POST" }));
    expect(res.status).toBe(500);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe(ErrorCode.INTERNAL);
  });

  // G.8 — request body edge cases
  it("body is valid JSON array (not object) → 400 VALIDATION_FAILED", async () => {
    const handler = withHandler({
      input: z.object({ name: z.string() }),
      handler: async () => ({}),
    });
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify([{ name: "injected" }]),
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it("non-JSON body string with schema → body unparseable → 400 VALIDATION_FAILED", async () => {
    const handler = withHandler({
      input: z.object({ name: z.string() }),
      handler: async () => ({}),
    });
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "this is not json",
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const body = await readJson<ErrBody>(res);
    expect(body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
  });
});
