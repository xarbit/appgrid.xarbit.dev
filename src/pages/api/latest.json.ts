// SPDX-FileCopyrightText: 2026 AppGrid Contributors
// SPDX-License-Identifier: GPL-2.0-or-later
//
// Static "latest version" manifest consumed by AppGrid's in-app update
// checker (universal-build only — see UpdateChecker.cpp). Generated at site
// build time from the GitHub releases API and served as a flat file by
// GitHub Pages, so AppGrid never has to talk to api.github.com directly
// (no rate-limit concerns, no auth).
//
// Shape:
//   {
//     "stable": {
//       "version": "1.7.9",
//       "rawTag":  "v1.7.9",
//       "release_notes_url": "https://github.com/…",
//       "universal": { "x86_64": {url,sha256}, "aarch64": {url,sha256} }
//     },
//     "prerelease": {                          // optional, only when ahead
//       "version": "1.8.0-rc.1",
//       "rawTag":  "v1.8.0-rc.1",
//       "release_notes_url": "…",
//       "universal": { … }
//     },
//
//     // Legacy top-level fields (always reflect stable) — kept for back-compat
//     // with AppGrid <= 1.8.0-rc.1 update checkers.
//     "version": "1.7.9",
//     "rawTag":  "v1.7.9",
//     "release_notes_url": "…",
//     "universal": { … }
//   }
//
// In-app update checker reads `stable.version` (or top-level `version` as
// fallback). Site UI uses both `stable` and `prerelease` to render badges.

import type { APIRoute } from "astro";

import {
  primary,
  fetchLatestRelease,
  fetchLatestPrerelease,
  pickAsset,
  type LatestRelease,
  type ReleaseAsset,
} from "../../config/repo";

interface UniversalEntry {
  url: string;
  sha256?: string;
}

interface ReleaseBlock {
  version: string;
  rawTag: string;
  release_notes_url: string;
  universal: Record<string, UniversalEntry>;
}

interface ManifestPayload extends ReleaseBlock {
  stable: ReleaseBlock;
  prerelease?: ReleaseBlock;
}

// Match the tarball naming used by packages/universal/build-package.sh:
//   appgrid-universal-<version>-<arch>.tar.gz
function tarballPattern(arch: string): RegExp {
  return new RegExp(`^appgrid-universal-.*-${arch}\\.tar\\.gz$`);
}

async function readSha256Asset(asset: ReleaseAsset | null): Promise<string | undefined> {
  if (!asset) return undefined;
  try {
    const res = await fetch(asset.url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return undefined;
    const text = (await res.text()).trim();
    // sha256sum output: "<hex>  <filename>". Strip the filename if present.
    const hex = text.split(/\s+/)[0];
    return /^[0-9a-f]{64}$/i.test(hex) ? hex.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

async function entryForArch(release: LatestRelease, arch: string): Promise<UniversalEntry | null> {
  const tarball = pickAsset(release.assets, tarballPattern(arch));
  if (!tarball) return null;
  const sha = pickAsset(release.assets, new RegExp(`^${tarball.name.replace(/[.\\/]/g, "\\$&")}\\.sha256$`));
  return {
    url: tarball.url,
    sha256: await readSha256Asset(sha),
  };
}

async function buildBlock(release: LatestRelease): Promise<ReleaseBlock> {
  const universal: Record<string, UniversalEntry> = {};
  for (const arch of ["x86_64", "aarch64"] as const) {
    const entry = await entryForArch(release, arch);
    if (entry) universal[arch] = entry;
  }
  return {
    version: release.tag,
    rawTag: release.rawTag,
    release_notes_url: release.htmlUrl,
    universal,
  };
}

export const GET: APIRoute = async () => {
  const stable = await fetchLatestRelease(primary);
  if (!stable) {
    return new Response(
      JSON.stringify({ error: "release information unavailable" }, null, 2),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  const prerelease = await fetchLatestPrerelease(primary);

  const stableBlock = await buildBlock(stable);
  const prereleaseBlock = prerelease ? await buildBlock(prerelease) : undefined;

  const payload: ManifestPayload = {
    // Top-level mirrors `stable` for back-compat with the AppGrid 1.8.0-rc
    // update checker which only reads `version` + `release_notes_url`.
    ...stableBlock,
    stable: stableBlock,
    ...(prereleaseBlock ? { prerelease: prereleaseBlock } : {}),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      // Belt + suspenders alongside robots.txt Disallow and the sitemap
      // filter — this is a machine-readable endpoint, not a page.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
};
