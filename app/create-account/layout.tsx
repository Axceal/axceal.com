import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Axceal account.",
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: "/create-account" },
};

export default function CreateAccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
