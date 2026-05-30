import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Axceal — Aero x1";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Code-generated OG card. Avoid bundling a static PNG so brand changes only
// touch this file. Twitter inherits this via next/metadata when no separate
// twitter-image is defined.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#0000f4",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: 80,
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 999,
            background: "#0000f4",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 90,
            fontWeight: 800,
            letterSpacing: -4,
            marginBottom: 40,
          }}
        >
          A
        </div>
        <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: -2 }}>
          Axceal
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: "#1e1e1e",
            marginTop: 12,
          }}
        >
          Aero x1
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: "#aaaaaa",
            marginTop: 24,
          }}
        >
          Precision pocket companion
        </div>
      </div>
    ),
    { ...size },
  );
}
