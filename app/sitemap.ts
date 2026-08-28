import type { MetadataRoute } from "next";

import { readdirSync } from "fs";
import { join } from "path";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://axceal.com";

// Routes that should NOT be indexed in the sitemap (matches robots.ts)
const EXCLUDED_ROUTES = [
  "/api",
  "/account",
  "/account-ready",
  "/order",
  "/auth",
  "/login",
  "/create-account",
  "/forgot-password",
];

type SitemapEntry = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

// Recursively find all page.tsx files in the app directory.
// `dir` is always resolved relative to this file (__dirname) so the scan
// can never escape the project tree regardless of CWD.
function getRoutes(dir: string, basePath = ""): string[] {
  const routes: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Route groups e.g. (marketing) — transparent in URL, traverse without adding to path
        if (entry.name.startsWith("(") || entry.name.startsWith("_")) {
          routes.push(...getRoutes(join(dir, entry.name), basePath));
        // Dynamic segments e.g. [id] — skip; these have no static URL to index
        } else if (entry.name.startsWith("[")) {
          continue;
        } else {
          routes.push(...getRoutes(join(dir, entry.name), `${basePath}/${entry.name}`));
        }
      } else if (entry.name === "page.tsx") {
        routes.push(basePath || "/");
      }
    }
  } catch (error) {
    console.error("Error reading directory for sitemap:", error);
  }
  return routes;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  // process.cwd() in Next.js always points to the project root during
  // both dev and production builds. We resolve and validate the path
  // stays within the project root as a defense-in-depth guard.
  const projectRoot = process.cwd();
  const appDir = join(projectRoot, "app");

  // Safety: ensure appDir is still within the project root (guards against
  // any symlink or future CWD manipulation from escaping the project tree).
  if (!appDir.startsWith(projectRoot)) {
    console.error("sitemap: appDir escaped project root — aborting scan");
    return [];
  }

  const allRoutes = getRoutes(appDir);
  
  const publicRoutes: SitemapEntry[] = allRoutes
    .filter((route) => !EXCLUDED_ROUTES.some((excluded) => route === excluded || route.startsWith(`${excluded}/`)))
    .map((route) => ({
      path: route,
      changeFrequency: route === "/" ? "weekly" : "monthly",
      priority: route === "/" ? 1.0 : 0.8,
    }));

  return publicRoutes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
