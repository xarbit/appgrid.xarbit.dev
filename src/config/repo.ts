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
