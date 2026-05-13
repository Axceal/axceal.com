import sharp from "sharp";
import fs from "fs";
import path from "path";

const ASSETS = path.join(process.cwd(), "public", "assets");

interface CropSpec {
  svgFile: string;
  pngOut: string;
  svgW: number;
  svgH: number;
  rotateCCW?: boolean; // true for navigation (shape is rotated 90° in SVG)
}

const SPECS: CropSpec[] = [
  { svgFile: "aero svg.svg",                            pngOut: "aero.png",        svgW: 244, svgH: 150 },
  { svgFile: "aero top pic for cues slide.svg",         pngOut: "aero-cues.png",   svgW: 474, svgH: 178 },
  { svgFile: "aero side view for navigation slide.svg", pngOut: "aero-nav.png",    svgW: 178, svgH: 474, rotateCCW: true },
  { svgFile: "aero inside view for sense slide.svg",    pngOut: "aero-sense.png",  svgW: 212, svgH: 402 },
  { svgFile: "aero side profile for feather slide.svg", pngOut: "aero-feather.png",svgW: 236, svgH: 441 },
  { svgFile: "aero side view for battary slide.svg",    pngOut: "aero-battery.png",svgW: 180, svgH: 405 },
];

(async () => {
  for (const { svgFile, pngOut, svgW, svgH, rotateCCW } of SPECS) {
    const svgPath = path.join(ASSETS, svgFile);
    const pngPath = path.join(ASSETS, pngOut);

    // 1. Re-extract PNG from SVG base64
    const svgContent = fs.readFileSync(svgPath, "utf8");
    const b64Match = svgContent.match(/data:image\/png;base64,([A-Za-z0-9+/=\s]+)/);
    if (!b64Match) { console.warn(`[SKIP] No PNG in ${svgFile}`); continue; }
    const pngBuf = Buffer.from(b64Match[1].replace(/\s/g, ""), "base64");

    // 2. Get matrix transform values
    const t = svgContent.match(/matrix\(([^)]+)\)/)![1].trim().split(/\s+/).map(Number);
    const [a,,, d, e, f] = t;

    // 3. Compute visible region in PNG coordinates
    const x0 = Math.round(-e / a);
    const y0 = Math.round(-f / d);
    const x1 = Math.round((1 - e) / a);
    const y1 = Math.round(-f / d + (1 / d));
    const cropW = x1 - x0;
    const cropH = y1 - y0;

    // Get actual PNG dimensions to clamp crop
    const meta = await sharp(pngBuf).metadata();
    const imgW = meta.width!;
    const imgH = meta.height!;
    const safeX0 = Math.max(0, x0);
    const safeY0 = Math.max(0, y0);
    const safeW = Math.min(cropW, imgW - safeX0);
    const safeH = Math.min(cropH, imgH - safeY0);

    // 4. Crop then (optionally rotate), then resize with fill to match SVG aspect
    let pipeline = sharp(pngBuf).extract({ left: safeX0, top: safeY0, width: safeW, height: safeH });

    if (rotateCCW) {
      // SVG shape has rotate(90) = 90° CCW, so the pattern content appears rotated CCW.
      // sharp rotate(90) = 90° CW. For CCW use rotate(270) or rotate(-90).
      pipeline = pipeline.rotate(270);
    }

    // Resize with fill (non-uniform scale) to exactly match SVG natural size × 2 (retina)
    await pipeline.resize(svgW * 2, svgH * 2, { fit: "fill" }).toFile(pngPath);

    const kb = Math.round(fs.statSync(pngPath).size / 1024);
    const rotNote = rotateCCW ? " (rotated CCW)" : "";
    console.log(`${pngOut}: crop(${safeX0},${safeY0},${safeW}x${safeH})${rotNote} → ${svgW*2}x${svgH*2} ${kb}KB`);
  }
  console.log("Done.");
})();
