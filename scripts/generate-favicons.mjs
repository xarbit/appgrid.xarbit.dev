// SPDX-License-Identifier: GPL-2.0-or-later
//
// Generates PNG favicons from public/favicon.svg at build time. Google's
// favicon-in-search indexer prefers raster formats (PNG/ICO) over SVG —
// without these, search results show the generic globe placeholder.
//
// Outputs:
//   public/favicon-48.png       — minimum size Google recommends
//   public/favicon-96.png       — sharper variant for high-DPI snippets
//   public/apple-touch-icon.png — 180×180 for iOS home-screen + macOS bookmark bar
//
// Run: bun run scripts/generate-favicons.mjs
// Wired as prebuild via "build" script in package.json.

import { Resvg } from "@resvg/resvg-js";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");
const svgPath = resolve(publicDir, "favicon.svg");

const svg = await readFile(svgPath, "utf8");

const sizes = [
  // Modern browsers (still useful as low-DPI tab icons).
  { name: "favicon-48.png", width: 48 },
  // Higher-DPI fallback for Google snippets + retina tabs.
  { name: "favicon-96.png", width: 96 },
  // iOS home-screen + macOS Safari bookmarks / pinned tabs.
  { name: "apple-touch-icon.png", width: 180 },
  // favicon.ico — historically a multi-size ICO container, but every
  // modern browser also accepts a PNG with the .ico extension. Astro's
  // template ships an "A"-logo PNG-in-.ico, and many browsers prefer
  // /favicon.ico over /favicon.svg even when the SVG link comes first
  // in <head>. Overwriting with our own 32×32 PNG kills the leftover
  // Astro A that desktop browsers were still pulling.
  { name: "favicon.ico", width: 32 },
];

for (const { name, width } of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "transparent",
  });
  const out = resolve(publicDir, name);
  await writeFile(out, resvg.render().asPng());
  console.log(`✓ wrote ${name} (${width}×${width})`);
}
