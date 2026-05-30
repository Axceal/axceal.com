// JSON-LD builders for the public surface. Render via:
//   <script type="application/ld+json"
//           dangerouslySetInnerHTML={{ __html: JSON.stringify(builder()) }} />
//
// CSP already permits `'unsafe-inline'` for `script-src` (next.config.ts), so
// no nonce wiring is required. Validate via
// https://search.google.com/test/rich-results when adding new shapes.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://axceal.com";

// Sitewide brand entity. Drives Google's brand panel / sitelinks. Goes in the
// root layout so every page contributes the same brand identity.
export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Axceal",
    legalName: "Axceal Pvt. Ltd.",
    url: SITE_URL,
    logo: `${SITE_URL}/icon`,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "contact@axceal.com",
        telephone: "+91-88302-61513",
        areaServed: "IN",
        availableLanguage: ["en"],
      },
    ],
  };
}

// Lets Google offer a sitelinks search box for branded queries.
export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Axceal",
    url: SITE_URL,
    inLanguage: "en-IN",
  };
}

// Single SKU — emitted on the home page only. Price + currency in paise
// matches AERO.priceInPaise (999900 paise = INR 9,999).
export function productLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Aero x1",
    sku: "AERO-X1",
    brand: { "@type": "Brand", name: "Axceal" },
    image: `${SITE_URL}/opengraph-image`,
    description:
      "Aero x1 by Axceal — precision pocket companion with multi-dimensional cues, surround sense, all-axis anchor navigation, IP68 build, and up to 23-hour battery life.",
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: "9999",
      availability: "https://schema.org/InStock",
      url: SITE_URL,
      seller: { "@type": "Organization", name: "Axceal" },
    },
  };
}

// Helper: render an LD blob inside an RSC. Stringified once; React handles
// the script tag injection without re-renders.
export function jsonLdScript(data: unknown) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}
