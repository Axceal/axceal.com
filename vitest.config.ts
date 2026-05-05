import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    globals: false,
    testTimeout: 15_000,
    coverage: {
      provider: "v8",
      include: ["lib/**", "app/api/**"],
      exclude: [
        "lib/db/client.ts",
        "lib/db/schema.ts",
        "lib/env.ts",
        "lib/product.ts",
        // NextAuth init — mocked in all tests; branches exercised only by framework
        "lib/auth/config.ts",
        "lib/auth/index.ts",
        // Browser-only client — document-dependent, not runnable in Node test env
        "lib/http/client.ts",
        // Singleton factory — analogous to lib/db/client.ts
        "lib/razorpay/client.ts",
        // Env-driven logger init — no meaningful testable branches
        "lib/logger.ts",
        // NextAuth re-export route — no application logic
        "app/api/auth/[...nextauth]/route.ts",
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
