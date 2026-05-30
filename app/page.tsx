import type { Metadata } from "next";
import ReactDOM from "react-dom";
import { HomeClient } from "./HomeClient";
import { jsonLdScript, productLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Aero x1 — Axceal",
  description:
    "Aero x1 by Axceal. Precision pocket companion with battery, sense, navigation, cues, and feather modes. Order direct with secure checkout.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "Aero x1 — Axceal",
    description:
      "Aero x1 by Axceal. Precision pocket companion. Order direct with secure checkout.",
  },
};

export default function Home() {
  // §7 — preload hero image so browser fetches it in parallel with HTML
  // parse instead of waiting for the AeroIcon <img> tag to mount during
  // hydration. Cuts ~100–300ms off LCP for the Aero device image.
  ReactDOM.preload("/assets/aero svg.svg", { as: "image" });

  return (
    <>
      {/* §5 — Product LD: surfaces price + availability in Google rich results. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(productLd())}
      />
      <HomeClient />
    </>
  );
}
