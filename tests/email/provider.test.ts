import { describe, it, expect } from "vitest";
import { emailProvider } from "@/lib/email/provider";
import { consoleProvider } from "@/lib/email/console";

describe("lib/email/provider", () => {
  it("NODE_ENV=test → emailProvider is consoleProvider", () => {
    expect(emailProvider).toBe(consoleProvider);
  });

  it("emailProvider satisfies EmailProvider interface (has sendOtp)", () => {
    expect(typeof emailProvider.sendOtp).toBe("function");
  });

  it("consoleProvider satisfies EmailProvider interface", () => {
    expect(typeof consoleProvider.sendOtp).toBe("function");
  });

  it("consoleProvider.sendOtp resolves without throwing", async () => {
    await expect(consoleProvider.sendOtp("test@example.com", "1234")).resolves.toBeUndefined();
  });
});
