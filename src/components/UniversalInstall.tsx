import { useState } from "react";
import ChecksumBlock from "./ChecksumBlock";
import type { ArchAsset, ArchPair } from "./InstallTabs";

interface Props {
  releasesUrl: string;
  releaseHtmlUrl: string;
  universal: ArchPair;
  /** Tag of the currently-selected release channel — used to mock URLs
   * when the real tarball for an arch hasn't been published yet. */
  channelTag: string;
  /** Base for release-download URLs (e.g. "https://github.com/<owner>/<repo>/releases/download"). */
  releaseDownloadBase: string;
}

type Arch = "x86_64" | "aarch64";

const supportedDistros = [
  { name: "KDE Linux", color: "#3daee9" },
  { name: "Kinoite", color: "#3c6eb4" },
  { name: "Bazzite", color: "#8a2be2" },
  { name: "Aurora", color: "#5e9eff" },
  { name: "Kalpa", color: "#73ba25" },
  { name: "SteamOS", color: "#1a9fff" },
];

function buildSteps(
  asset: ArchAsset | null,
  arch: Arch,
  tag: string,
  base: string,
): { label: string; code: string }[] {
  // Mock realistic asset URL when CI has not published one for this
  // arch yet. Names match what packages/universal/build-package.sh emits.
  const mockName = `appgrid-universal-${tag}-${arch}.tar.gz`;
  const mockUrl = `${base}/v${tag}/${mockName}`;
  const name = asset?.name ?? mockName;
  const url = asset?.url ?? mockUrl;
  const dir = name.replace(/\.tar\.gz$/, "");
  const hash = asset?.sha256 ?? "<sha256-from-release-page>";
  return [
    { label: "1 — Download", code: `curl -LO ${url}` },
    {
      label: "2 — Verify checksum (optional)",
      code: `# Optional integrity check — skip if you trust the source.\necho "${hash}  ${name}" | sha256sum -c -`,
    },
    { label: "3 — Extract", code: `tar -xzf ${name}` },
    { label: "4 — Run installer", code: `cd ${dir}\n./install.sh` },
  ];
}

export default function UniversalInstall({
  releaseHtmlUrl,
  universal,
  channelTag,
  releaseDownloadBase,
}: Props) {
  const [arch, setArch] = useState<Arch>("x86_64");
  const [copied, setCopied] = useState<string | null>(null);

  const activeAsset = arch === "x86_64" ? universal.x86_64 : universal.aarch64;
  const steps = buildSteps(activeAsset, arch, channelTag, releaseDownloadBase);

  const copy = async (key: string, text: string) => {
    const stripped = text
      .split("\n")
      .filter((l) => !l.trim().startsWith("#"))
      .join("\n")
      .trim();
    if (!stripped) return;
    try {
      await navigator.clipboard.writeText(stripped);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard blocked
    }
  };

  const archEntries: { arch: Arch; asset: ArchAsset | null; label: string }[] = [
    { arch: "x86_64", asset: universal.x86_64, label: "x86_64" },
    { arch: "aarch64", asset: universal.aarch64, label: "aarch64 / arm64" },
  ];

  return (
    <div id="universal-install" className="breeze-card overflow-hidden border-[#e67e22]/30">
      <div className="p-5 md:p-6 border-b border-[var(--border)] flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#e67e22]/15 border border-[#e67e22]/30 grid place-items-center text-[#f5a35e] flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 9.4 7.5 4.21" />
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-base">Universal package</h3>
              <span className="px-1.5 py-0.5 text-[10px] rounded uppercase tracking-wide bg-[#e67e22]/20 text-[#f5a35e] border border-[#e67e22]/40">
                Beta
              </span>
              <span className="px-1.5 py-0.5 text-[10px] rounded uppercase tracking-wide bg-[#3daee9]/15 text-[#3daee9] border border-[#3daee9]/30">
                New in 1.8.0
              </span>
            </div>
            <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
              User-local <code className="px-1 py-0.5 rounded bg-[var(--canvas-deep)] border border-[var(--border)] text-[var(--fg)] text-xs">~/.local/</code> install. No root, no package manager.
              Runs on any Plasma 6.4+ system. Primary install path for immutable distros.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-5">
        <div className="rounded-lg border border-[#f1c40f]/40 bg-[#f1c40f]/10 p-4">
          <div className="flex items-start gap-3 text-sm text-[var(--fg-body)]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="mt-0.5 flex-shrink-0 text-[#f4d03f]"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="font-semibold text-[var(--fg)] mb-1">
                Migrating from a distro package?
              </p>
              <p className="text-[var(--fg-muted)] leading-relaxed">
                Uninstall the system-wide copy first — otherwise two AppGrid plasmoids
                will register and Plasma will load whichever it finds first.
                The installer detects this and prints the right uninstall command
                for your distro before doing anything.
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-2.5 font-medium">
            Built for
          </div>
          <div className="flex flex-wrap gap-2">
            {supportedDistros.map((d) => (
              <span
                key={d.name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#e67e22]/30 bg-[#e67e22]/5 text-xs text-[var(--fg-body)]"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: d.color }}
                  aria-hidden="true"
                />
                {d.name}
              </span>
            ))}
            <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-[var(--border)] text-xs text-[var(--fg-muted)]">
              + any other Plasma 6.4+ distro
            </span>
          </div>
        </div>

        <div className="text-center py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
            {archEntries.map(({ arch: a, asset, label }) => {
              const isActive = a === arch;
              const isAvailable = asset !== null;
              const cls = isAvailable
                ? `inline-flex flex-col items-center gap-1 px-5 py-3 rounded-lg border-2 transition-colors text-sm font-semibold ${
                    isActive
                      ? "bg-[#e67e22] border-[#e67e22] text-white shadow-lg shadow-[#e67e22]/25"
                      : "border-[#e67e22]/30 text-[var(--fg-muted)] hover:border-[#e67e22]/60 hover:text-[var(--fg)]"
                  }`
                : "inline-flex flex-col items-center gap-1 px-5 py-3 rounded-lg border-2 border-[var(--border)] text-[var(--fg-subtle)] text-sm font-semibold opacity-50 cursor-not-allowed";

              return asset ? (
                <a
                  key={a}
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!isActive) {
                      e.preventDefault();
                      setArch(a);
                    }
                  }}
                  className={cls}
                >
                  <span className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </span>
                  <span className="text-xs font-normal opacity-90">{label}</span>
                </a>
              ) : (
                <span key={a} className={cls} title="Tarball not yet built for this architecture">
                  <span className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Unavailable
                  </span>
                  <span className="text-xs font-normal opacity-90">{label}</span>
                </span>
              );
            })}
          </div>
          <p className="text-xs text-[var(--fg-muted)] mt-3">
            Tarball · ~/.local install · click to download. Use the buttons to switch
            architecture below.
          </p>
          {activeAsset?.sha256 && (
            <ChecksumBlock hash={activeAsset.sha256} fileName={activeAsset.name} />
          )}
        </div>

        {/* Divider + step-by-step only when a real tarball exists for the
            active arch. Skipping the mock keeps stable channels (where
            universal isn't published) from showing a misleading wall of
            curl/tar commands pointing at non-existent files. */}
        {activeAsset && (
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-[var(--fg-subtle)]">
            <span className="flex-1 h-px bg-[var(--border)]" />
            <span>Or step-by-step in the terminal ({arch})</span>
            <span className="flex-1 h-px bg-[var(--border)]" />
          </div>
        )}

        {activeAsset && steps.map((step, i) => {
          const key = `universal-${arch}-${i}`;
          return (
            <div key={key}>
              <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-2 font-medium">
                {step.label}
              </div>
              <div className="relative group">
                <pre className="bg-[var(--canvas-deep)] border border-[var(--border)] rounded-lg p-4 pr-12 overflow-x-auto text-sm font-mono leading-relaxed text-[var(--fg)]">
                  <code>{step.code}</code>
                </pre>
                <button
                  onClick={() => copy(key, step.code)}
                  className="absolute top-2 right-2 px-2.5 py-1.5 text-xs btn-secondary"
                  aria-label="Copy"
                >
                  {copied === key ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          );
        })}

        <p className="text-sm text-[var(--fg-muted)] flex items-start gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mt-0.5 flex-shrink-0 text-[#3daee9]"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            Requires Plasma 6.4 or newer. First install needs one log-out + log-in so
            Plasma re-reads its session environment; later upgrades just need a
            plasmashell restart. See{" "}
            <a
              href={releaseHtmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-breeze-blue)] hover:underline"
            >
              all assets →
            </a>
          </span>
        </p>
      </div>
    </div>
  );
}
