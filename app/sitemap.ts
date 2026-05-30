import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://axceal.com";

// F16.7 — single source of truth for public-indexable routes. Add new
// indexable pages here so they show up in /sitemap.xml without requiring a
// crawler to discover them via internal links. Gated routes (/account,
// /order, /login, etc.) are excluded via app/robots.ts.
type SitemapEntry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

const PUBLIC_ROUTES: SitemapEntry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
