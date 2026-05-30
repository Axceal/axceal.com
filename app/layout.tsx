import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NavigationBar } from "./components/layout/NavigationBar";
import { Providers } from "./components/layout/Providers";
import { jsonLdScript, organizationLd, websiteLd } from "@/lib/seo/jsonld";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://axceal.com";

// §14 — Search Console / Bing verification tokens. Set these in Vercel env
// vars when claiming the domain in each console. If unset, Next omits the
// corresponding <meta> tag automatically.
const GSC_VERIFY = process.env.NEXT_PUBLIC_GSC_VERIFICATION;
const BING_VERIFY = process.env.NEXT_PUBLIC_BING_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Axceal — Aero x1",
    template: "%s — Axceal",
  },
  description:
    "Axceal builds Aero x1 — a precision pocket companion. Order direct from Axceal with secure checkout.",
  applicationName: "Axceal",
  authors: [{ name: "Axceal" }],
  generator: "Next.js",
  keywords: ["Axceal", "Aero", "Aero x1", "Anchor Dock"],
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Axceal",
    title: "Axceal — Aero x1",
    description:
      "Aero x1 by Axceal. Precision pocket companion. Order direct with secure checkout.",
    url: SITE_URL,
    locale: "en_IN",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Axceal — Aero x1",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Axceal — Aero x1",
    description:
      "Aero x1 by Axceal. Precision pocket companion. Order direct with secure checkout.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  verification: {
    ...(GSC_VERIFY ? { google: GSC_VERIFY } : {}),
    ...(BING_VERIFY ? { other: { "msvalidate.01": BING_VERIFY } } : {}),
  },
};

export const viewport: Viewport = {
  themeColor: "#0000f4",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen flex flex-col">
        {/* §5 — sitewide JSON-LD (Organization + WebSite). Page-level Product
            LD is emitted inside app/page.tsx so per-route entities stay co-
            located with their routes. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(organizationLd())}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(websiteLd())}
        />
        <Providers>
          <NavigationBar />
          {children}
        </Providers>
        {/* §14 — Vercel Analytics (page views) + Speed Insights (Core Web
            Vitals). Both no-op outside the Vercel runtime. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
