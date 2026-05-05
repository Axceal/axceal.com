import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { OtpEmail } from "@/lib/email/templates/otp";

describe("lib/email/templates/otp — OtpEmail", () => {
  it("renders an HTML string", async () => {
    const html = await render(OtpEmail({ code: "1234" }));
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(50);
  });

  it("OTP code appears in rendered output", async () => {
    const html = await render(OtpEmail({ code: "9876" }));
    expect(html).toContain("9876");
  });

  it("XSS: <script> in code field is escaped — not rendered as raw tag", async () => {
    const html = await render(OtpEmail({ code: "<script>alert(1)</script>" }));
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("preview text contains the code", async () => {
    const html = await render(OtpEmail({ code: "5555" }));
    expect(html).toContain("5555");
  });
});
