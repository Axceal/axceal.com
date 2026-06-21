import { describe, it, expect, vi } from "vitest";

// W9 — verify env.ts hard-rejects `NEXT_PUBLIC_SALES_MODE=dev-live` when
// NODE_ENV=production. We swap process.env then call vi.resetModules so the
// next dynamic import re-runs the Zod parse + post-parse guard fresh.
async function loadEnvWith(overrides: Record<string, string | undefined>): Promise<unknown> {
  const original: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(overrides)) {
    original[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.resetModules();
  try {
    const mod = await import("@/lib/env");
    return mod.env;
  } finally {
    for (const [k, v] of Object.entries(original)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    vi.resetModules();
  }
}

describe("env — sales mode guard", () => {
  it("rejects NEXT_PUBLIC_SALES_MODE=dev-live when NODE_ENV=production", async () => {
    await expect(
      loadEnvWith({
        NODE_ENV: "production",
        NEXT_PUBLIC_SALES_MODE: "dev-live",
        // Auth-gates flag must be off so the *other* prod guard does not
        // swallow our assertion.
        NEXT_PUBLIC_DEV_SKIP_AUTH_GATES: "false",
      }),
    ).rejects.toThrow(/dev-live is forbidden when NODE_ENV=production/);
  });
});
