/**
 * Single source of truth for repo links. Switch `primary` to migrate.
 * Mirrors render as secondary "Also on …" links where it makes sense.
 */

export type Platform = "github" | "codeberg";

export interface RepoConfig {
  platform: Platform;
  owner: string;
  repo: string;
  /** Display label, e.g. "GitHub" / "Codeberg" */
  label: string;
}

const REGISTRY: Record<Platform, Omit<RepoConfig, "owner" | "repo">> = {
  github: { platform: "github", label: "GitHub" },
  codeberg: { platform: "codeberg", label: "Codeberg" },
};

function make(platform: Platform, owner: string, repo: string): RepoConfig {
  return { ...REGISTRY[platform], owner, repo };
}

// === Edit here to migrate ===
export const primary: RepoConfig = make(
  "github",
  "xarbit",
  "plasma6-applet-appgrid",
);

export const mirrors: RepoConfig[] = [
  // Uncomment when Codeberg mirror exists:
  // make("codeberg", "xarbit", "plasma6-applet-appgrid"),
];
// ============================

export function repoUrl(r: RepoConfig): string {
  const host = r.platform === "github" ? "github.com" : "codeberg.org";
  return `https://${host}/${r.owner}/${r.repo}`;
}

export function issuesUrl(r: RepoConfig): string {
  return `${repoUrl(r)}/issues`;
}

export function releasesUrl(r: RepoConfig): string {
  return `${repoUrl(r)}/releases`;
}

/* === Star fetch with memo + disk cache to survive rate limits === */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const STAR_CACHE_FILE = ".astro/stars-cache.json";
const STAR_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface StarCacheEntry {
  count: number;
  fetchedAt: number;
}
type StarCache = Record<string, StarCacheEntry>;

const memoryCache: Map<string, Promise<number | null>> = new Map();
let diskCache: StarCache | null = null;

async function loadDiskCache(): Promise<StarCache> {
  if (diskCache) return diskCache;
  try {
    const raw = await readFile(STAR_CACHE_FILE, "utf8");
    diskCache = JSON.parse(raw) as StarCache;
  } catch {
    diskCache = {};
  }
  return diskCache;
}

async function saveDiskCache(cache: StarCache): Promise<void> {
  try {
    await mkdir(dirname(STAR_CACHE_FILE), { recursive: true });
    await writeFile(STAR_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.warn("[stars] cache write failed:", err);
  }
}

function cacheKey(r: RepoConfig): string {
  return `${r.platform}/${r.owner}/${r.repo}`;
}

/** Fetch star count with memo + 1h disk cache. Falls back to stale value on API failure. */
export async function fetchStars(r: RepoConfig): Promise<number | null> {
  const key = cacheKey(r);
  const memo = memoryCache.get(key);
  if (memo) return memo;

  const promise = (async (): Promise<number | null> => {
    const cache = await loadDiskCache();
    const cached = cache[key];
    const now = Date.now();
    if (cached && now - cached.fetchedAt < STAR_CACHE_TTL_MS) {
      return cached.count;
    }

    try {
      const headers: Record<string, string> = {
        "User-Agent": "appgrid-website-build",
      };
      let endpoint: string;
      if (r.platform === "github") {
        endpoint = `https://api.github.com/repos/${r.owner}/${r.repo}`;
        headers.Accept = "application/vnd.github+json";
        if (import.meta.env.GITHUB_TOKEN) {
          headers.Authorization = `Bearer ${import.meta.env.GITHUB_TOKEN}`;
        }
      } else {
        endpoint = `https://codeberg.org/api/v1/repos/${r.owner}/${r.repo}`;
        headers.Accept = "application/json";
        if (import.meta.env.CODEBERG_TOKEN) {
          headers.Authorization = `token ${import.meta.env.CODEBERG_TOKEN}`;
        }
      }

      const res = await fetch(endpoint, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        console.warn(`[stars] ${r.platform}: HTTP ${res.status} (using cache fallback)`);
        return cached?.count ?? null;
      }
      const data = (await res.json()) as {
        stargazers_count?: number;
        stars_count?: number;
      };
      const count = data.stargazers_count ?? data.stars_count ?? null;
      if (count !== null) {
        cache[key] = { count, fetchedAt: now };
        await saveDiskCache(cache);
      }
      return count;
    } catch (err) {
      console.warn(`[stars] ${r.platform} fetch failed (using cache fallback):`, err);
      return cached?.count ?? null;
    }
  })();

  memoryCache.set(key, promise);
  return promise;
}

export function formatStars(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return (k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")) + "k";
  }
  return String(n);
}

/* === Latest release version fetch === */

const VERSION_CACHE_FILE = ".astro/version-cache.json";
const VERSION_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface VersionCacheEntry {
  tag: string;
  fetchedAt: number;
}
type VersionCache = Record<string, VersionCacheEntry>;

const versionMemoryCache: Map<string, Promise<string | null>> = new Map();
let versionDiskCache: VersionCache | null = null;

async function loadVersionCache(): Promise<VersionCache> {
  if (versionDiskCache) return versionDiskCache;
  try {
    const raw = await readFile(VERSION_CACHE_FILE, "utf8");
    versionDiskCache = JSON.parse(raw) as VersionCache;
  } catch {
    versionDiskCache = {};
  }
  return versionDiskCache;
}

async function saveVersionCache(cache: VersionCache): Promise<void> {
  try {
    await mkdir(dirname(VERSION_CACHE_FILE), { recursive: true });
    await writeFile(VERSION_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.warn("[version] cache write failed:", err);
  }
}

/** Strip leading "v" from a release tag (e.g., "v1.7.9" → "1.7.9"). */
function normalizeTag(tag: string): string {
  return tag.replace(/^v/i, "").trim();
}

export interface ReleaseAsset {
  name: string;
  url: string;
}

export interface LatestRelease {
  tag: string; // normalized, no leading v
  rawTag: string; // original tag, e.g. "v1.7.9"
  htmlUrl: string;
  assets: ReleaseAsset[];
}

const RELEASE_CACHE_FILE = ".astro/release-cache.json";
const RELEASE_CACHE_TTL_MS = 60 * 60 * 1000;
type ReleaseCache = Record<string, { release: LatestRelease; fetchedAt: number }>;

const releaseMemoryCache: Map<string, Promise<LatestRelease | null>> = new Map();
let releaseDiskCache: ReleaseCache | null = null;

async function loadReleaseCache(): Promise<ReleaseCache> {
  if (releaseDiskCache) return releaseDiskCache;
  try {
    const raw = await readFile(RELEASE_CACHE_FILE, "utf8");
    releaseDiskCache = JSON.parse(raw) as ReleaseCache;
  } catch {
    releaseDiskCache = {};
  }
  return releaseDiskCache;
}

async function saveReleaseCache(cache: ReleaseCache): Promise<void> {
  try {
    await mkdir(dirname(RELEASE_CACHE_FILE), { recursive: true });
    await writeFile(RELEASE_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.warn("[release] cache write failed:", err);
  }
}

/** Fetch latest release with assets. Same memo/cache pattern as fetchStars. */
export async function fetchLatestRelease(r: RepoConfig): Promise<LatestRelease | null> {
  const key = cacheKey(r);
  const memo = releaseMemoryCache.get(key);
  if (memo) return memo;

  const promise = (async (): Promise<LatestRelease | null> => {
    const cache = await loadReleaseCache();
    const cached = cache[key];
    const now = Date.now();
    if (cached && now - cached.fetchedAt < RELEASE_CACHE_TTL_MS) {
      return cached.release;
    }

    try {
      const headers: Record<string, string> = {
        "User-Agent": "appgrid-website-build",
      };
      let endpoint: string;
      if (r.platform === "github") {
        endpoint = `https://api.github.com/repos/${r.owner}/${r.repo}/releases/latest`;
        headers.Accept = "application/vnd.github+json";
        if (import.meta.env.GITHUB_TOKEN) {
          headers.Authorization = `Bearer ${import.meta.env.GITHUB_TOKEN}`;
        }
      } else {
        endpoint = `https://codeberg.org/api/v1/repos/${r.owner}/${r.repo}/releases/latest`;
        headers.Accept = "application/json";
        if (import.meta.env.CODEBERG_TOKEN) {
          headers.Authorization = `token ${import.meta.env.CODEBERG_TOKEN}`;
        }
      }

      const res = await fetch(endpoint, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        console.warn(`[release] ${r.platform}: HTTP ${res.status} (using cache fallback)`);
        return cached?.release ?? null;
      }
      const data = (await res.json()) as {
        tag_name?: string;
        html_url?: string;
        assets?: Array<{ name: string; browser_download_url?: string; url?: string }>;
      };

      if (!data.tag_name) return cached?.release ?? null;

      const release: LatestRelease = {
        tag: normalizeTag(data.tag_name),
        rawTag: data.tag_name,
        htmlUrl: data.html_url ?? `${repoUrl(r)}/releases/tag/${data.tag_name}`,
        assets: (data.assets ?? []).map((a) => ({
          name: a.name,
          url: a.browser_download_url ?? a.url ?? "",
        })),
      };

      cache[key] = { release, fetchedAt: now };
      await saveReleaseCache(cache);
      return release;
    } catch (err) {
      console.warn(`[release] ${r.platform} fetch failed (using cache fallback):`, err);
      return cached?.release ?? null;
    }
  })();

  releaseMemoryCache.set(key, promise);
  return promise;
}

/** Pick the first asset whose filename matches the regex. */
export function pickAsset(assets: ReleaseAsset[], pattern: RegExp): ReleaseAsset | null {
  return assets.find((a) => pattern.test(a.name)) ?? null;
}

/**
 * If a `<assetName>.sha256` sidecar exists in the same release, fetch it and
 * return the hex digest. Returns null when no sidecar exists or the fetch
 * fails (the UI then hides its checksum block). Adds a 5s timeout so a flaky
 * GitHub Pages CDN won't stall the whole site build.
 */
export async function fetchSha256Sidecar(
  assets: ReleaseAsset[],
  assetName: string,
): Promise<string | null> {
  const sidecarName = `${assetName}.sha256`;
  const sidecar = assets.find((a) => a.name === sidecarName);
  if (!sidecar) return null;
  try {
    const res = await fetch(sidecar.url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    const hex = text.split(/\s+/)[0];
    return /^[0-9a-f]{64}$/i.test(hex) ? hex.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Fetch the most recent pre-release (rc / beta / alpha) ahead of the stable
 * release. Returns null if no pre-release exists or it isn't newer than the
 * current stable.
 */
export async function fetchLatestPrerelease(r: RepoConfig): Promise<LatestRelease | null> {
  if (r.platform !== "github") return null;

  try {
    const headers: Record<string, string> = {
      "User-Agent": "appgrid-website-build",
      Accept: "application/vnd.github+json",
    };
    if (import.meta.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${import.meta.env.GITHUB_TOKEN}`;
    }
    const endpoint = `https://api.github.com/repos/${r.owner}/${r.repo}/releases?per_page=20`;
    const res = await fetch(endpoint, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(`[prerelease] ${r.platform}: HTTP ${res.status}`);
      return null;
    }
    const list = (await res.json()) as Array<{
      tag_name?: string;
      html_url?: string;
      prerelease?: boolean;
      draft?: boolean;
      assets?: Array<{ name: string; browser_download_url?: string; url?: string }>;
    }>;

    const stable = await fetchLatestRelease(r);
    // Skip non-semver "latest" snapshot releases — the dev-release CI job
    // publishes a rolling prerelease tagged literally "latest" that would
    // otherwise win the list.find() race and make isVersionNewer parse
    // its tag as 0.0.0 vs the real stable, returning null.
    const candidate = list.find((rel) =>
        rel.prerelease &&
        !rel.draft &&
        rel.tag_name &&
        /^v?\d+\.\d+\.\d+/.test(rel.tag_name)
    );
    if (!candidate?.tag_name) return null;

    const tag = normalizeTag(candidate.tag_name);
    if (stable && !isVersionNewer(tag, stable.tag)) return null;

    return {
      tag,
      rawTag: candidate.tag_name,
      htmlUrl: candidate.html_url ?? `${repoUrl(r)}/releases/tag/${candidate.tag_name}`,
      assets: (candidate.assets ?? []).map((a) => ({
        name: a.name,
        url: a.browser_download_url ?? a.url ?? "",
      })),
    };
  } catch (err) {
    console.warn(`[prerelease] ${r.platform} fetch failed:`, err);
    return null;
  }
}

/** Strict semver-ish "is a newer than b" — strips leading v, numeric segment
 * compare with pre-release tail ranked below the corresponding release.
 * Mirrors the AppGrid C++ UpdateChecker::isNewer logic so the website's
 * notion of "newer" matches what the in-app checker decides.
 */
function isVersionNewer(a: string, b: string): boolean {
  const strip = (s: string) => (s.startsWith("v") ? s.slice(1) : s);
  const split = (s: string): [string, string] => {
    const plus = s.indexOf("+");
    const head = plus < 0 ? s : s.slice(0, plus);
    const dash = head.indexOf("-");
    return dash < 0 ? [head, ""] : [head.slice(0, dash), head.slice(dash + 1)];
  };
  const [aCore, aPre] = split(strip(a));
  const [bCore, bPre] = split(strip(b));
  const pa = aCore.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = bCore.split(".").map((n) => parseInt(n, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const ia = pa[i] ?? 0;
    const ib = pb[i] ?? 0;
    if (ia !== ib) return ia > ib;
  }
  if (aPre === "" && bPre !== "") return true;
  if (aPre !== "" && bPre === "") return false;
  return aPre > bPre;
}

/** Fetch latest release tag with memo + 1h disk cache. Returns normalized tag (no leading v). */
export async function fetchLatestVersion(r: RepoConfig): Promise<string | null> {
  const key = cacheKey(r);
  const memo = versionMemoryCache.get(key);
  if (memo) return memo;

  const promise = (async (): Promise<string | null> => {
    const cache = await loadVersionCache();
    const cached = cache[key];
    const now = Date.now();
    if (cached && now - cached.fetchedAt < VERSION_CACHE_TTL_MS) {
      return cached.tag;
    }

    try {
      const headers: Record<string, string> = {
        "User-Agent": "appgrid-website-build",
      };
      let endpoint: string;
      if (r.platform === "github") {
        endpoint = `https://api.github.com/repos/${r.owner}/${r.repo}/releases/latest`;
        headers.Accept = "application/vnd.github+json";
        if (import.meta.env.GITHUB_TOKEN) {
          headers.Authorization = `Bearer ${import.meta.env.GITHUB_TOKEN}`;
        }
      } else {
        endpoint = `https://codeberg.org/api/v1/repos/${r.owner}/${r.repo}/releases/latest`;
        headers.Accept = "application/json";
        if (import.meta.env.CODEBERG_TOKEN) {
          headers.Authorization = `token ${import.meta.env.CODEBERG_TOKEN}`;
        }
      }

      const res = await fetch(endpoint, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        console.warn(`[version] ${r.platform}: HTTP ${res.status} (using cache fallback)`);
        return cached?.tag ?? null;
      }
      const data = (await res.json()) as { tag_name?: string };
      const tag = data.tag_name ? normalizeTag(data.tag_name) : null;
      if (tag) {
        cache[key] = { tag, fetchedAt: now };
        await saveVersionCache(cache);
      }
      return tag;
    } catch (err) {
      console.warn(`[version] ${r.platform} fetch failed (using cache fallback):`, err);
      return cached?.tag ?? null;
    }
  })();

  versionMemoryCache.set(key, promise);
  return promise;
}
