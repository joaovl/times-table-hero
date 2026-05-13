// Generates the PWA icon set from public/favicon.png.
//
// Produces:
//   public/pwa-192.png            — 192x192 square
//   public/pwa-512.png            — 512x512 square
//   public/pwa-512-maskable.png   — 512x512 with the source centred inside an
//                                   80% safe zone, padded with the manifest
//                                   background colour (#ffffff). The 10% bleed
//                                   on each side lets Android crop the icon to
//                                   a circle, squircle, etc. without clipping
//                                   the artwork.
//
// Run with: node scripts/generate-pwa-icons.mjs
//
// Requires `sharp` as a devDependency.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "public", "favicon.png");
const outDir = join(root, "public");

const MASKABLE_BG = { r: 255, g: 255, b: 255, alpha: 1 };

async function main() {
  await mkdir(outDir, { recursive: true });

  // Standard 192 and 512 square icons — straight resize.
  await sharp(src)
    .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(outDir, "pwa-192.png"));

  await sharp(src)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(outDir, "pwa-512.png"));

  // Maskable: render the source inside the central 80% safe zone (409.6 ~ 410
  // px) on a 512x512 canvas with the manifest background colour.
  const inner = Math.round(512 * 0.8); // 410
  const innerBuf = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: MASKABLE_BG,
    },
  })
    .composite([{ input: innerBuf, gravity: "center" }])
    .png()
    .toFile(join(outDir, "pwa-512-maskable.png"));

  console.log("Wrote pwa-192.png, pwa-512.png, pwa-512-maskable.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
