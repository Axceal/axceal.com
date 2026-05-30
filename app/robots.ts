import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://axceal.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account",
          "/account/",
          "/account-ready",
          "/order",
          "/order/",
          "/auth",
          "/login",
          "/create-account",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    // F16.8 — `host` is Yandex-specific; major crawlers ignore. Dropped to
    // keep robots.txt minimal.
  };
}
