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
//     "version": "1.8.1",                          // normalized, no leading v
//     "rawTag":  "v1.8.1",                         // original tag
//     "released": "2026-05-20",                    // YYYY-MM-DD
//     "release_notes_url": "https://github.com/…",
//     "universal": {
//       "x86_64":  { "url": "…", "sha256": "…" },
//       "aarch64": { "url": "…", "sha256": "…" }
//     }
//   }
//
// AppGrid only reads `version` + `release_notes_url`. The rest is for
// future Phase 2 ("Update now" download) and for site UI use.

import type { APIRoute } from "astro";

import {
  primary,
  fetchLatestRelease,
  pickAsset,
  type LatestRelease,
  type ReleaseAsset,
} from "../../config/repo";

interface UniversalEntry {
  url: string;
  sha256?: string;
}

interface ManifestPayload {
  version: string;
  rawTag: string;
  released?: string;
  release_notes_url: string;
  universal: Record<string, UniversalEntry>;
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

export const GET: APIRoute = async () => {
  const release = await fetchLatestRelease(primary);
  if (!release) {
    return new Response(
      JSON.stringify({ error: "release information unavailable" }, null, 2),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const universal: ManifestPayload["universal"] = {};
  for (const arch of ["x86_64", "aarch64"] as const) {
    const entry = await entryForArch(release, arch);
    if (entry) universal[arch] = entry;
  }

  const payload: ManifestPayload = {
    version: release.tag,
    rawTag: release.rawTag,
    release_notes_url: release.htmlUrl,
    universal,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      // Hint for any caching layer in front of GitHub Pages — file refreshes
      // on each site build, which itself only happens on release publish.
      "Cache-Control": "public, max-age=3600",
    },
  });
};
