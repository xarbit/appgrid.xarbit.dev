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
  { name: "favicon-48.png", width: 48 },
  { name: "favicon-96.png", width: 96 },
  { name: "apple-touch-icon.png", width: 180 },
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
