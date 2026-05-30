import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Continue to your Axceal account.",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: "/auth" },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
