import type { Metadata } from "next";
import { Suspense } from "react";
import ReactDOM from "react-dom";
import { HomeClient } from "./HomeClient";
import { jsonLdScript, productLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "Aero x1 by Axceal",
  description:
    "Aero x1 by Axceal. Order direct with secure checkout.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "Aero x1 Axceal",
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
      {/* W9 debug — HomeClient calls useSearchParams (for the ?joined=1
          waitlist redirect). Next 15 requires a Suspense boundary around any
          client subtree that reads search params, or the page silently opts
          out of static generation and `next build` errors. */}
      <Suspense fallback={null}>
        <HomeClient />
      </Suspense>
    </>
  );
}
