import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Code-generated favicon. Builds at request/build time so no PNG asset
// needs to live in the repo. Replace with a real brand mark when available.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0000f4",
          color: "#ffffff",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        A
      </div>
    ),
    { ...size },
  );
}
