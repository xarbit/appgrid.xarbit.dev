// SPDX-License-Identifier: GPL-2.0-or-later
//
// Generates public/og.png at build time. Open Graph card shown when the site
// is shared on Mastodon, Discord, Slack, Twitter/X, etc. Hand-authored SVG
// (no Satori/JSX needed) → rasterised via resvg-js.
//
// Run: bun run scripts/generate-og.mjs
// Wired as prebuild via "build" script in package.json.

import { Resvg } from "@resvg/resvg-js";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../public/og.png");

const W = 1200;
const H = 630;

// Authored as a single SVG. Avoid <text> with custom fonts (resvg-js'
// default has no system font discovery) — use SVG <text> with Sans-serif
// fallback; the layout is dominated by the geometric badges and logo,
// so font rendering is forgiving.
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Background: dark Breeze base with brand gradient mesh -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"  stop-color="#1b1e20"/>
      <stop offset="100%" stop-color="#232629"/>
    </linearGradient>
    <radialGradient id="blueGlow" cx="20%" cy="80%" r="55%">
      <stop offset="0%"  stop-color="#3daee9" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#3daee9" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="purpleGlow" cx="85%" cy="20%" r="55%">
      <stop offset="0%"  stop-color="#9b59b6" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#9b59b6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"  stop-color="#3daee9"/>
      <stop offset="100%" stop-color="#9b59b6"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#blueGlow)"/>
  <rect width="${W}" height="${H}" fill="url(#purpleGlow)"/>

  <!-- Logo mark: app-grid 3x3 dots in Breeze blue -->
  <g transform="translate(72, 92)" fill="#3daee9">
    <rect x="0"  y="0"  width="22" height="22" rx="5"/>
    <rect x="36" y="0"  width="22" height="22" rx="5"/>
    <rect x="72" y="0"  width="22" height="22" rx="5"/>
    <rect x="0"  y="36" width="22" height="22" rx="5"/>
    <rect x="36" y="36" width="22" height="22" rx="5"/>
    <rect x="72" y="36" width="22" height="22" rx="5"/>
    <rect x="0"  y="72" width="22" height="22" rx="5"/>
    <rect x="36" y="72" width="22" height="22" rx="5"/>
    <rect x="72" y="72" width="22" height="22" rx="5"/>
  </g>

  <!-- Title: AppGrid (gradient) for Plasma (muted) -->
  <text x="72" y="290"
        font-family="'Noto Sans','DejaVu Sans','Liberation Sans',sans-serif"
        font-size="120" font-weight="800" fill="url(#titleGrad)">AppGrid</text>
  <text x="72" y="370"
        font-family="'Noto Sans','DejaVu Sans','Liberation Sans',sans-serif"
        font-size="44" font-weight="500" fill="#888a8d">for KDE Plasma 6</text>

  <!-- Subtitle / tagline -->
  <text x="72" y="450"
        font-family="'Noto Sans','DejaVu Sans','Liberation Sans',sans-serif"
        font-size="30" font-weight="400" fill="#c7c9cc">Grid-style replacement for Kickoff.</text>
  <text x="72" y="490"
        font-family="'Noto Sans','DejaVu Sans','Liberation Sans',sans-serif"
        font-size="30" font-weight="400" fill="#c7c9cc">Search, drag-and-drop, KRunner.</text>

  <!-- Bottom badge row: KDE Plasma 6 / GPL-2.0 / 12+ distros -->
  <g transform="translate(72, 540)">
    <g>
      <rect x="0" y="0" width="220" height="42" rx="21" fill="#3daee9" fill-opacity="0.15" stroke="#3daee9" stroke-opacity="0.4"/>
      <circle cx="22" cy="21" r="5" fill="#3daee9"/>
      <text x="40" y="28"
            font-family="'Noto Sans','DejaVu Sans','Liberation Sans',sans-serif"
            font-size="18" font-weight="600" fill="#c7c9cc">KDE Plasma 6.0+</text>
    </g>
    <g transform="translate(240, 0)">
      <rect x="0" y="0" width="140" height="42" rx="21" fill="#27ae60" fill-opacity="0.15" stroke="#27ae60" stroke-opacity="0.4"/>
      <circle cx="22" cy="21" r="5" fill="#27ae60"/>
      <text x="40" y="28"
            font-family="'Noto Sans','DejaVu Sans','Liberation Sans',sans-serif"
            font-size="18" font-weight="600" fill="#c7c9cc">GPL-2.0</text>
    </g>
    <g transform="translate(400, 0)">
      <rect x="0" y="0" width="220" height="42" rx="21" fill="#e67e22" fill-opacity="0.15" stroke="#e67e22" stroke-opacity="0.4"/>
      <circle cx="22" cy="21" r="5" fill="#e67e22"/>
      <text x="40" y="28"
            font-family="'Noto Sans','DejaVu Sans','Liberation Sans',sans-serif"
            font-size="18" font-weight="600" fill="#c7c9cc">12+ distros supported</text>
    </g>
  </g>

  <!-- Right side decorative: stylized grid representing the launcher -->
  <g transform="translate(740, 130)">
    <rect x="0" y="0" width="380" height="380" rx="24" fill="#2a2d31" stroke="#3daee9" stroke-opacity="0.3" stroke-width="2"/>
    <!-- Search bar mock -->
    <rect x="24" y="24" width="332" height="40" rx="8" fill="#1b1e20"/>
    <circle cx="44" cy="44" r="6" fill="none" stroke="#888" stroke-width="2"/>
    <line x1="49" y1="49" x2="56" y2="56" stroke="#888" stroke-width="2"/>
    <!-- App icons grid 4x4 -->
    ${(() => {
      const rows = 4, cols = 4;
      const cellW = 332 / cols;
      const startY = 88;
      const cellH = 70;
      const colors = ["#3daee9", "#e67e22", "#27ae60", "#9b59b6", "#f1c40f", "#e74c3c", "#1abc9c", "#3498db"];
      let s = "";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = 24 + c * cellW + (cellW - 40) / 2;
          const y = startY + r * cellH;
          const color = colors[(r * cols + c) % colors.length];
          s += `<rect x="${x}" y="${y}" width="40" height="40" rx="10" fill="${color}" fill-opacity="0.85"/>`;
        }
      }
      return s;
    })()}
  </g>
</svg>`;

const resvg = new Resvg(svg, {
  background: "#1b1e20",
  fitTo: { mode: "width", value: W },
  font: {
    // resvg-js needs an explicit font path or it falls back to its built-in
    // generic. Most Linux runners have DejaVu, which our font-family stack
    // names as a fallback — this lets the text render even if no system
    // font discovery succeeds.
    loadSystemFonts: true,
  },
});

const pngData = resvg.render().asPng();

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, pngData);

console.log(`✓ wrote ${outPath} (${(pngData.length / 1024).toFixed(1)} KB)`);
