import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Axceal",
    short_name: "Axceal",
    description: "Aero x1 by Axceal",
    // F16.5 — explicit id decouples PWA identity from start_url, so future
    // tracking-query additions on start_url won't be treated as a new app
    // and won't strand already-installed users.
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0000f4",
    orientation: "portrait",
    lang: "en-IN",
    icons: [
      { src: "/icon", sizes: "any", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
