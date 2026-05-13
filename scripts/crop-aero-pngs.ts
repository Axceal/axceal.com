import sharp from "sharp";
import fs from "fs";
import path from "path";

const ASSETS = path.join(process.cwd(), "public", "assets");

const CROPS: { png: string; left: number; top: number; width: number; height: number; svgW: number; svgH: number }[] = [
  { png: "aero.png",      left: 426, top: 214, width: 1063, height: 649, svgW: 244, svgH: 150 },
  { png: "aero-cues.png", left: 467, top: 359, width: 1000, height: 372, svgW: 474, svgH: 178 },
  { png: "aero-nav.png",  left: 451, top: 355, width: 1020, height: 381, svgW: 178, svgH: 474 },
  { png: "aero-sense.png",    left: 767, top: 177, width: 383, height: 724, svgW: 212, svgH: 402 },
  { png: "aero-feather.png",  left: 716, top: 101, width: 523, height: 980, svgW: 236, svgH: 441 },
  { png: "aero-battery.png",  left: 701, top: 0,   width: 467, height: 1053, svgW: 180, svgH: 405 },
];

(async () => {
  for (const { png, left, top, width, height, svgW, svgH } of CROPS) {
    const src = path.join(ASSETS, png);
    const tmp = src + ".tmp.png";
    await sharp(src)
      .extract({ left, top, width, height })
      .resize(svgW * 2, svgH * 2)  // 2x for retina, matches SVG natural size * 2
      .toFile(tmp);
    fs.renameSync(tmp, src);
    const kb = Math.round(fs.statSync(src).size / 1024);
    console.log(`${png}: cropped + resized to ${svgW * 2}x${svgH * 2} → ${kb}KB`);
  }
  console.log("Done.");
})();
