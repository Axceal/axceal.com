import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isProd = process.env.NODE_ENV === "production";

const cspProd = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.razorpay.com",
  "font-src 'self' data:",
  // va.vercel-scripts.com — @vercel/analytics + @vercel/speed-insights beacon
  // endpoint. Speed Insights also POSTs to /_vercel/speed-insights which is
  // same-origin and already covered by 'self'.
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.razorpay.com https://va.vercel-scripts.com",
  // F14.8 — api.razorpay.com is the JSON API endpoint, not a frameable
  // origin. Razorpay Checkout embeds checkout.razorpay.com only.
  "frame-src https://checkout.razorpay.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const alwaysHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const prodOnlyHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: cspProd },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: [],
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: isProd ? [...alwaysHeaders, ...prodOnlyHeaders] : alwaysHeaders,
      },
      // SEO §15 — cache headers for static / RSC-cacheable assets.
      // Home is RSC + non-`force-dynamic`; let the edge cache hold it briefly
      // and serve stale while revalidating in the background.
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      // Long-cache the SEO surface files themselves — they regenerate at
      // build time and on revalidation; bots re-fetch infrequently.
      {
        source: "/(sitemap.xml|robots.txt|manifest.webmanifest|icon|apple-icon|opengraph-image)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  async redirects() {
    // SEO §15 — collapse common stray aliases to the canonical root so any
    // outbound link / typo still indexes against the single canonical URL.
    // F16.9 — kept non-permanent (307) so a future need to repurpose
    // /home or /index isn't blocked by infinitely-cached browser 301 entries.
    // Googlebot follows 307 just as readily for canonicalisation.
    return [
      { source: "/home", destination: "/", permanent: false },
      { source: "/index", destination: "/", permanent: false },
      { source: "/index.html", destination: "/", permanent: false },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
