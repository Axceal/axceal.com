import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.local") });

if (!process.env.NODE_ENV) {
  (process.env as Record<string, string>).NODE_ENV = "test";
}

// Fallbacks so Phase 7 tests run in CI / empty-env shells. Real values in
// .env.local always win (dotenv loads first).
const testDefaults: Record<string, string> = {
  RAZORPAY_KEY_ID: "rzp_test_dummy",
  RAZORPAY_KEY_SECRET: "rzp_test_dummy_secret",
  RAZORPAY_WEBHOOK_SECRET: "rzp_test_dummy_webhook",
};
for (const [k, v] of Object.entries(testDefaults)) {
  if (!process.env[k]) {
    (process.env as Record<string, string>)[k] = v;
  }
}
