import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account ready",
  description: "Finish setting up your Axceal account.",
  robots: { index: false, follow: false, nocache: true },
};

export default function AccountReadyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
