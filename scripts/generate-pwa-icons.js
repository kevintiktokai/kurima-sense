#!/usr/bin/env node
/**
 * Generate the full PWA icon set (Android, iOS, Windows) plus iOS splash
 * screens from a single source image, and update public/manifest.json.
 *
 * Source resolution order:
 *   1. public/icon-source.png  (preferred)
 *   2. public/logo.png         (fallback)
 *
 * Outputs:
 *   public/icons/icon-{72,96,128,144,152,192,384,512}x*.png   (purpose=any)
 *   public/icons/maskable-icon-{192,512}x*.png                (purpose=maskable, 80% safe zone)
 *   public/icons/favicon-{16,32}x*.png
 *   public/apple-touch-icon.png
 *   public/apple-touch-icon-180x180.png
 *   public/favicon.ico                                        (16/32/48 multi-size)
 *   public/splash/apple-splash-WxH.png                        (5 common iPhone sizes)
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const ICONS_DIR = path.join(PUBLIC_DIR, "icons");
const SPLASH_DIR = path.join(PUBLIC_DIR, "splash");
const MANIFEST_PATH = path.join(PUBLIC_DIR, "manifest.json");

const BG_COLOR = "#F4F1ED";    // manifest background_color (Earthy Elegance)
const THEME_COLOR = "#0fb885"; // manifest theme_color (brand primary)

const STANDARD_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];
const FAVICON_PNG_SIZES = [16, 32];
const FAVICON_ICO_SIZES = [16, 32, 48];
const APPLE_TOUCH_SIZE = 180;
const MASKABLE_SAFE_ZONE = 0.8; // logo fills 80% of canvas; outer 10% padding each side

// Portrait splash screens for current iPhone + iPad lineup.
const SPLASH_SCREENS = [
  // iPhone
  { width: 1290, height: 2796, device: "iPhone 14 Pro Max / 15 Plus / 15 Pro Max" },
  { width: 1179, height: 2556, device: "iPhone 14 Pro / 15 / 15 Pro" },
  { width: 1170, height: 2532, device: "iPhone 13 / 14" },
  { width: 1284, height: 2778, device: "iPhone 12 Pro Max / 13 Pro Max" },
  { width: 750,  height: 1334, device: "iPhone 6 / 7 / 8 / SE2" },
  // iPad — portrait
  { width: 2048, height: 2732, device: "iPad Pro 12.9\" (portrait)" },
  { width: 1668, height: 2388, device: "iPad Pro 11\" (portrait)" },
  { width: 1640, height: 2360, device: "iPad Air 10.9\" (portrait)" },
  { width: 1620, height: 2160, device: "iPad 10.2\" (portrait)" },
  { width: 1488, height: 2266, device: "iPad mini 8.3\" (portrait)" },
  // iPad — landscape (dimensions swapped)
  { width: 2732, height: 2048, device: "iPad Pro 12.9\" (landscape)" },
  { width: 2388, height: 1668, device: "iPad Pro 11\" (landscape)" },
  { width: 2360, height: 1640, device: "iPad Air 10.9\" (landscape)" },
  { width: 2160, height: 1620, device: "iPad 10.2\" (landscape)" },
  { width: 2266, height: 1488, device: "iPad mini 8.3\" (landscape)" },
];

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) throw new Error(`Invalid hex color: ${hex}`);
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16), alpha: 1 };
}

async function fileExists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function resolveSource() {
  const preferred = path.join(PUBLIC_DIR, "icon-source.png");
  if (await fileExists(preferred)) return preferred;
  const fallback = path.join(PUBLIC_DIR, "logo.png");
  if (await fileExists(fallback)) {
    console.warn(
      `[warn] ${path.relative(ROOT, preferred)} not found — using ` +
      `${path.relative(ROOT, fallback)} as source.`
    );
    return fallback;
  }
  throw new Error(
    "No source image found. Place a high-res square PNG at public/icon-source.png " +
    "(or public/logo.png) and re-run."
  );
}

function logWrote(absPath) {
  console.log(`  ✓ ${path.relative(ROOT, absPath)}`);
}

async function resizeToBuffer(source, size) {
  return sharp(source)
    .resize(size, size, { fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();
}

async function generateStandardIcons(source) {
  console.log("\nStandard icons (purpose=any):");
  for (const size of STANDARD_SIZES) {
    const out = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    const buf = await resizeToBuffer(source, size);
    await fs.writeFile(out, buf);
    logWrote(out);
  }
}

async function generateMaskableIcons(source) {
  console.log("\nMaskable icons (purpose=maskable, 80% safe zone):");
  const bg = hexToRgb(BG_COLOR);
  for (const size of MASKABLE_SIZES) {
    const inner = Math.round(size * MASKABLE_SAFE_ZONE);
    const logo = await resizeToBuffer(source, inner);
    const out = path.join(ICONS_DIR, `maskable-icon-${size}x${size}.png`);
    await sharp({
      create: { width: size, height: size, channels: 4, background: bg },
    })
      .composite([{ input: logo, gravity: "center" }])
      .png()
      .toFile(out);
    logWrote(out);
  }
}

async function generateAppleTouchIcons(source) {
  console.log("\nApple touch icons:");
  const buf = await resizeToBuffer(source, APPLE_TOUCH_SIZE);
  const outputs = [
    path.join(PUBLIC_DIR, `apple-touch-icon-${APPLE_TOUCH_SIZE}x${APPLE_TOUCH_SIZE}.png`),
    path.join(PUBLIC_DIR, "apple-touch-icon.png"),
  ];
  for (const out of outputs) {
    await fs.writeFile(out, buf);
    logWrote(out);
  }
}

async function generateFavicons(source) {
  console.log("\nFavicons:");
  for (const size of FAVICON_PNG_SIZES) {
    const out = path.join(ICONS_DIR, `favicon-${size}x${size}.png`);
    const buf = await resizeToBuffer(source, size);
    await fs.writeFile(out, buf);
    logWrote(out);
  }

  const icoPath = path.join(PUBLIC_DIR, "favicon.ico");
  const pngBuffers = await Promise.all(
    FAVICON_ICO_SIZES.map((size) => resizeToBuffer(source, size))
  );
  await fs.writeFile(icoPath, buildIcoFromPngs(FAVICON_ICO_SIZES, pngBuffers));
  logWrote(icoPath);
}

/**
 * Build a multi-size .ico file whose entries are PNG-compressed.
 * Modern .ico supports embedded PNGs for sizes ≥ 48, but all major
 * browsers accept PNG payloads for any size, so we use PNG throughout.
 */
function buildIcoFromPngs(sizes, pngs) {
  const count = sizes.length;
  const headerLen = 6 + count * 16;
  const header = Buffer.alloc(headerLen);

  // ICONDIR
  header.writeUInt16LE(0, 0); // reserved, must be 0
  header.writeUInt16LE(1, 2); // type = 1 (icon)
  header.writeUInt16LE(count, 4);

  let dataOffset = headerLen;
  sizes.forEach((size, i) => {
    const entry = 6 + i * 16;
    const pngSize = pngs[i].length;
    header.writeUInt8(size >= 256 ? 0 : size, entry + 0);  // width (0 means 256)
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);  // height
    header.writeUInt8(0, entry + 2);                       // colorCount (0 = ≥256 colors)
    header.writeUInt8(0, entry + 3);                       // reserved
    header.writeUInt16LE(1, entry + 4);                    // color planes
    header.writeUInt16LE(32, entry + 6);                   // bits per pixel
    header.writeUInt32LE(pngSize, entry + 8);              // bytes in payload
    header.writeUInt32LE(dataOffset, entry + 12);          // payload offset
    dataOffset += pngSize;
  });

  return Buffer.concat([header, ...pngs]);
}

async function generateSplashScreens(source) {
  console.log("\niOS splash screens (logo centered on theme color):");
  const bg = hexToRgb(THEME_COLOR);
  for (const { width, height, device } of SPLASH_SCREENS) {
    const logoSize = Math.round(Math.min(width, height) * 0.3);
    const logo = await resizeToBuffer(source, logoSize);
    const out = path.join(SPLASH_DIR, `apple-splash-${width}x${height}.png`);
    await sharp({
      create: { width, height, channels: 4, background: bg },
    })
      .composite([{ input: logo, gravity: "center" }])
      .png()
      .toFile(out);
    console.log(`  ✓ ${path.relative(ROOT, out)}  (${device})`);
  }
}

async function updateManifest() {
  console.log("\nManifest:");
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));

  const standard = STANDARD_SIZES.map((size) => ({
    src: `/icons/icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: "any",
  }));
  const maskable = MASKABLE_SIZES.map((size) => ({
    src: `/icons/maskable-icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: "maskable",
  }));

  manifest.icons = [...standard, ...maskable];

  if (Array.isArray(manifest.shortcuts)) {
    manifest.shortcuts = manifest.shortcuts.map((s) => ({
      ...s,
      icons: [
        {
          src: "/icons/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
      ],
    }));
  }

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  logWrote(MANIFEST_PATH);
}

async function main() {
  await fs.mkdir(ICONS_DIR, { recursive: true });
  await fs.mkdir(SPLASH_DIR, { recursive: true });

  const source = await resolveSource();
  const meta = await sharp(source).metadata();
  console.log(`Source: ${path.relative(ROOT, source)} (${meta.width}x${meta.height})`);

  await generateStandardIcons(source);
  await generateMaskableIcons(source);
  await generateAppleTouchIcons(source);
  await generateFavicons(source);
  await generateSplashScreens(source);
  await updateManifest();

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\n[error]", err.message || err);
  process.exit(1);
});
