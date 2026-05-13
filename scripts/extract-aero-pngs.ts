import fs from "fs";
import path from "path";

const ASSETS_DIR = path.join(process.cwd(), "public", "assets");

const SVG_FILES: { svg: string; png: string; label: string }[] = [
  { svg: "aero svg.svg",                             png: "aero.png",           label: "AeroIcon" },
  { svg: "aero top pic for cues slide.svg",          png: "aero-cues.png",      label: "AeroCuesSlideIcon" },
  { svg: "aero side view for navigation slide.svg",  png: "aero-nav.png",       label: "AeroNavigationSlideIcon" },
  { svg: "aero inside view for sense slide.svg",     png: "aero-sense.png",     label: "AeroSenseSlideIcon" },
  { svg: "aero side profile for feather slide.svg",  png: "aero-feather.png",   label: "AeroFeatherSlideIcon" },
  { svg: "aero side view for battary slide.svg",     png: "aero-battery.png",   label: "AeroBatterySlideIcon" },
];

for (const { svg, png, label } of SVG_FILES) {
  const svgPath = path.join(ASSETS_DIR, svg);
  const pngPath = path.join(ASSETS_DIR, png);

  if (!fs.existsSync(svgPath)) {
    console.warn(`[SKIP] Not found: ${svg}`);
    continue;
  }

  const content = fs.readFileSync(svgPath, "utf8");

  // Extract viewBox/width/height from SVG root element
  const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
  const svgWidthMatch = content.match(/<svg[^>]+width="([^"]+)"/);
  const svgHeightMatch = content.match(/<svg[^>]+height="([^"]+)"/);

  // Find embedded image element dimensions
  const imgWidthMatch = content.match(/<image[^>]+width="([^"]+)"/);
  const imgHeightMatch = content.match(/<image[^>]+height="([^"]+)"/);

  const w = imgWidthMatch?.[1] ?? svgWidthMatch?.[1] ?? viewBoxMatch?.[1]?.split(" ")[2];
  const h = imgHeightMatch?.[1] ?? svgHeightMatch?.[1] ?? viewBoxMatch?.[1]?.split(" ")[3];

  // Extract base64 PNG data
  const b64Match = content.match(/data:image\/png;base64,([A-Za-z0-9+/=\s]+)/);
  if (!b64Match) {
    console.warn(`[SKIP] No embedded PNG found in: ${svg}`);
    continue;
  }

  const b64 = b64Match[1].replace(/\s/g, "");
  const buf = Buffer.from(b64, "base64");
  fs.writeFileSync(pngPath, buf);

  const svgKB = Math.round(fs.statSync(svgPath).size / 1024);
  const pngKB = Math.round(buf.length / 1024);
  console.log(`[${label}] ${svg} (${svgKB}KB) → ${png} (${pngKB}KB)  dims: ${w}×${h}`);
}

console.log("Done.");
