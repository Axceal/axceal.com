import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Axceal account password.",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: "/forgot-password" },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
