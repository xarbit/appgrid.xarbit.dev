import { useState } from "react";
import ChecksumBlock from "./ChecksumBlock";
import DistroLogo from "./DistroLogo";

type DistroKey = "arch" | "fedora" | "ubuntu" | "debian" | "opensuse" | "gentoo";

export interface ArchAsset {
  url: string;
  name: string;
  sha256: string | null;
}

export interface ArchPair {
  x86_64: ArchAsset | null;
  aarch64: ArchAsset | null;
}

interface TerminalStep {
  label: string;
  code: string;
}

type Arch = "x86_64" | "aarch64";

interface Tab {
  id: string;
  label: string;
  color: string;
  badge?: string;
  /** Yellow callout shown at the top of the tab body — used for the
   *  community-maintained-package warning on openSUSE / Gentoo. */
  topWarning?: string;
  /** Per-arch downloads. If omitted, no download buttons render. */
  downloads?: ArchPair;
  /** Build terminal steps for the active arch + channel tag + release base. */
  buildSteps?: (
    asset: ArchAsset | null,
    arch: Arch,
    tag: string,
    base: string,
  ) => TerminalStep[];
  /** Fixed steps when arch is irrelevant (openSUSE, Gentoo). */
  fixedSteps?: TerminalStep[];
  /** Recommended/primary install path shown before the download section.
   * Used for Arch where AUR is the official path and the CI .pkg.tar.zst
   * is an alternative (and the only channel for pre-releases). */
  primarySteps?: TerminalStep[];
  primaryLabel?: string;
  /** Heading + note for the secondary (download-based) section when a
   * primarySteps block is also present. */
  secondaryLabel?: string;
  secondaryNote?: string;
  /** Caption under the download button(s). */
  downloadHint?: string;
  note?: string;
}

interface Props {
  releasesUrl: string;
  releaseHtmlUrl: string;
  arch: ArchPair;
  fedora: ArchPair;
  ubuntu: ArchPair;
  debian: ArchPair;
  /** Tag of the currently-selected release channel — used to mock URLs
   * when the real asset for an arch hasn't been published yet. */
  channelTag: string;
  /** Base for release-download URLs (e.g. "https://github.com/<owner>/<repo>/releases/download").
   * Used to build mock URLs when an asset for an arch isn't built yet. */
  releaseDownloadBase: string;
}

// Mock realistic release asset URLs when CI hasn't published the matching
// arch yet (so the terminal steps always read like real commands). Names
// follow what CI emits — see .github/workflows/build.yml +
// .github/workflows/release.yml.

// Convert a release tag (e.g. "1.8.0-rc.1") into the version segment CI
// uses inside .rpm / .deb filenames. RPM forbids "-" in Version: and
// rpmbuild + dpkg-deb end up with "." (e.g. 1.8.0.rc.1). Stable tags pass
// through unchanged ("1.8.0" -> "1.8.0").
function debRpmVersion(tag: string): string {
  return tag.replace(/-/g, ".").replace(/\+.*/, "");
}

function verifyStep(stepIndex: number, asset: ArchAsset | null, name: string): TerminalStep {
  const hash = asset?.sha256 ?? "<sha256-from-release-page>";
  return {
    label: `${stepIndex} — Verify checksum (optional)`,
    code: `# Optional integrity check — skip if you trust the source.\necho "${hash}  ${name}" | sha256sum -c -`,
  };
}

function fedoraSteps(
  asset: ArchAsset | null,
  arch: Arch,
  tag: string,
  base: string,
): TerminalStep[] {
  const mockName = `plasma-applet-appgrid-${debRpmVersion(tag)}-1.fc44.${arch}.rpm`;
  const name = asset?.name ?? mockName;
  const url = asset?.url ?? `${base}/v${tag}/${mockName}`;
  return [
    { label: "1 — Download", code: `curl -LO ${url}` },
    verifyStep(2, asset, name),
    { label: "3 — Install", code: `sudo dnf install ./${name}` },
  ];
}

function debSteps(family: "ubuntu" | "debian") {
  return (
    asset: ArchAsset | null,
    arch: Arch,
    tag: string,
    base: string,
  ): TerminalStep[] => {
    const debArch = arch === "x86_64" ? "amd64" : "arm64";
    const v = debRpmVersion(tag);
    const mockName =
      family === "ubuntu"
        ? `plasma-applet-appgrid_${v}-1ubuntu25.04_plucky_${debArch}.deb`
        : `plasma-applet-appgrid_${v}-1debian13_trixie_${debArch}.deb`;
    const name = asset?.name ?? mockName;
    const url = asset?.url ?? `${base}/v${tag}/${mockName}`;
    return [
      { label: "1 — Download", code: `curl -LO ${url}` },
      verifyStep(2, asset, name),
      { label: "3 — Install", code: `sudo apt install ./${name}` },
    ];
  };
}

export default function InstallTabs({
  releaseHtmlUrl,
  arch,
  fedora,
  ubuntu,
  debian,
  channelTag,
  releaseDownloadBase,
}: Props) {
  const tabs: Tab[] = [
    {
      id: "arch",
      label: "Arch",
      color: "#1793d1",
      badge: "Official",
      primaryLabel: "Recommended — install from AUR",
      primarySteps: [
        { label: "Via yay", code: "yay -S plasma6-applets-appgrid" },
        { label: "Or via paru", code: "paru -S plasma6-applets-appgrid" },
      ],
      downloads: arch,
      downloadHint: "Arch · x86_64 · .pkg.tar.zst",
      secondaryLabel: "Or use the CI pre-built package",
      secondaryNote: "AUR ships stable releases only. To install a pre-release, use the .pkg.tar.zst below — it's the only channel for pre-release Arch builds.",
      buildSteps: (asset, _a, tag, base) => {
        const mockName = `plasma6-applets-appgrid-${tag.replace(/-/g, "_")}-1-x86_64.pkg.tar.zst`;
        const name = asset?.name ?? mockName;
        const url = asset?.url ?? `${base}/v${tag}/${mockName}`;
        const hash = asset?.sha256 ?? "<sha256-from-release-page>";
        return [
          { label: "1 — Download", code: `curl -LO ${url}` },
          {
            label: "2 — Verify checksum (optional)",
            code: `# Optional integrity check — skip if you trust the source.\necho "${hash}  ${name}" | sha256sum -c -`,
          },
          { label: "3 — Install with pacman", code: `sudo pacman -U ./${name}` },
        ];
      },
      note: "AUR works on Arch Linux and any derivative with AUR access (EndeavourOS, CachyOS, Manjaro, Garuda). Maintained by the author.",
    },
    {
      id: "fedora",
      label: "Fedora",
      color: "#3c6eb4",
      badge: "CI",
      topWarning:
        "Auto-built in CI for Fedora 42+ on every tagged release. Not an official Fedora package, not in the Fedora repos — less tested than the AUR or Universal builds. Verify the SHA256 sidecar after download and please report any issues you hit.",
      downloads: fedora,
      downloadHint: "Fedora 42+ · .rpm",
      buildSteps: fedoraSteps,
      note: "Pick the matching architecture above.",
    },
    {
      id: "ubuntu",
      label: "Ubuntu",
      color: "#e95420",
      badge: "CI",
      topWarning:
        "Auto-built in CI for Ubuntu 25.04, 25.10 and 26.04 on every tagged release. Not an official Ubuntu package, not in the Ubuntu archive or any PPA — less tested than the AUR or Universal builds. Verify the SHA256 sidecar after download and please report any issues you hit.",
      downloads: ubuntu,
      downloadHint: "Ubuntu 25.04+ · .deb",
      buildSteps: debSteps("ubuntu"),
      note: "Pick the matching architecture above; see all assets on the release page for other Ubuntu versions.",
    },
    {
      id: "debian",
      label: "Debian",
      color: "#a81d33",
      badge: "CI",
      topWarning:
        "Auto-built in CI for Debian 13 (trixie) on every tagged release. Not an official Debian package, not in the Debian archive — less tested than the AUR or Universal builds. Verify the SHA256 sidecar after download and please report any issues you hit.",
      downloads: debian,
      downloadHint: "Debian 13+ · .deb",
      buildSteps: debSteps("debian"),
      note: "Pick the matching architecture above.",
    },
    {
      id: "opensuse",
      label: "openSUSE",
      color: "#73ba25",
      badge: "Community",
      topWarning:
        "Community-maintained on the openSUSE Build Service by @JMarcosHP01. Not an official AppGrid release — please report packaging issues to the OBS package page first.",
      fixedSteps: [
        {
          label: "1 — Add the OBS repo (Tumbleweed)",
          code: "sudo zypper addrepo https://download.opensuse.org/repositories/home:JMarcosHP01/openSUSE_Tumbleweed/home:JMarcosHP01.repo",
        },
        { label: "2 — Refresh", code: "sudo zypper refresh" },
        {
          label: "3 — Install",
          code: "sudo zypper install plasma6-applet-appgrid",
        },
      ],
      note: "On Leap 15.6, swap openSUSE_Tumbleweed in the URL for openSUSE_Leap_15.6. Full package + other distro URLs on the OBS package page: https://build.opensuse.org/package/show/home:JMarcosHP01/plasma6-applet-appgrid",
    },
    {
      id: "gentoo",
      label: "Gentoo",
      color: "#54487a",
      badge: "Community",
      topWarning:
        "Community-maintained overlay by @mnalmahmud. Not an official AppGrid release — please report packaging issues to the overlay first.",
      fixedSteps: [
        {
          label: "1 — Add the overlay",
          code: "sudo eselect repository add mnalmahmud-overlay git https://github.com/mnalmahmud/mnalmahmud-overlay.git",
        },
        { label: "2 — Sync", code: "sudo emaint sync -r mnalmahmud-overlay" },
        { label: "3 — Install", code: "sudo emerge -av kde-misc/plasma6-applet-appgrid" },
      ],
      note: "Requires eselect-repository. Overlay source: https://github.com/mnalmahmud/mnalmahmud-overlay",
    },
  ];

  const [active, setActive] = useState(tabs[0].id);
  const [archByTab, setArchByTab] = useState<Record<string, Arch>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const current = tabs.find((t) => t.id === active)!;
  const currentArch: Arch = archByTab[current.id] ?? "x86_64";

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

  const setArch = (arch: Arch) => {
    setArchByTab((m) => ({ ...m, [current.id]: arch }));
  };

  const archAssets: { arch: Arch; asset: ArchAsset | null; label: string }[] = current.downloads
    ? [
        { arch: "x86_64", asset: current.downloads.x86_64, label: "x86_64" },
        { arch: "aarch64", asset: current.downloads.aarch64, label: "aarch64 / arm64" },
      ]
    : [];

  const activeAsset =
    current.downloads ? (currentArch === "x86_64" ? current.downloads.x86_64 : current.downloads.aarch64) : null;

  const steps: TerminalStep[] = current.fixedSteps
    ? current.fixedSteps
    : current.buildSteps
      ? current.buildSteps(activeAsset, currentArch, channelTag, releaseDownloadBase)
      : [];

  return (
    <div className="breeze-card overflow-hidden">
      <div className="flex flex-wrap border-b border-[var(--border)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-4 md:px-5 py-3 text-sm font-medium transition-colors relative ${
              active === t.id
                ? "text-[var(--fg)]"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className="flex-shrink-0"
                style={{ color: t.color }}
                aria-hidden="true"
              >
                <DistroLogo distro={t.id as DistroKey} size={16} />
              </span>
              {t.label}
              {t.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded uppercase tracking-wide ${
                    t.badge === "Official"
                      ? "bg-[#27ae60]/20 text-[#5fd48a] border border-[#27ae60]/40"
                      : t.badge === "CI"
                        ? "bg-[#f1c40f]/15 text-[#f4d03f] border border-[#f1c40f]/40"
                        : t.badge === "Beta"
                          ? "bg-[#e67e22]/20 text-[#f5a35e] border border-[#e67e22]/40"
                          : "bg-[#9b59b6]/20 text-[#c084d6] border border-[#9b59b6]/40"
                  }`}
                  title={
                    t.badge === "CI"
                      ? "Auto-built in CI from GitHub Releases. Provided as-is."
                      : t.badge === "Beta"
                        ? "New install path in 1.8.0 — please report any issues."
                        : undefined
                  }
                >
                  {t.badge}
                </span>
              )}
            </span>
            {active === t.id && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#3daee9]" />
            )}
          </button>
        ))}
      </div>

      <div className="p-5 md:p-6 space-y-5">
        {current.topWarning && (
          <div className="rounded-lg border border-[#f1c40f]/40 bg-[#f1c40f]/10 p-3">
            <p className="text-sm text-[var(--fg-body)] flex items-start gap-2.5 leading-relaxed">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mt-0.5 flex-shrink-0 text-[#f4d03f]"
                aria-hidden="true"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{current.topWarning}</span>
            </p>
          </div>
        )}

        {current.primarySteps && current.primarySteps.length > 0 && (
          <div className="space-y-3">
            {current.primaryLabel && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded bg-[#27ae60]/20 text-[#5fd48a] border border-[#27ae60]/40 font-semibold">
                  Recommended
                </span>
                <span className="text-sm text-[var(--fg-body)] font-medium">
                  {current.primaryLabel.replace(/^Recommended\s*—\s*/, "")}
                </span>
              </div>
            )}
            {current.primarySteps.map((step, i) => {
              const key = `${current.id}-primary-${i}`;
              return (
                <div key={key}>
                  <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-2 font-medium">
                    {step.label}
                  </div>
                  <div className="relative">
                    <pre className="bg-[var(--canvas-deep)] border border-[var(--border)] rounded-lg p-4 pr-12 overflow-x-auto text-sm font-mono leading-relaxed text-[var(--fg)]">
                      <code>{step.code}</code>
                    </pre>
                    <button
                      onClick={() => copy(key, step.code)}
                      className="absolute top-2 right-2 px-2.5 py-1.5 text-xs rounded bg-[var(--card)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
                      aria-label="Copy"
                    >
                      {copied === key ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {current.primarySteps && current.downloads && (
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-[var(--fg-subtle)]">
            <span className="flex-1 h-px bg-[var(--border)]" />
            <span>{current.secondaryLabel ?? "Or use the pre-built package"}</span>
            <span className="flex-1 h-px bg-[var(--border)]" />
          </div>
        )}

        {current.primarySteps && current.secondaryNote && (
          <p className="text-sm text-[var(--fg-muted)] flex items-start gap-2 -mt-2">
            <svg
              width="16"
              height="16"
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
            {current.secondaryNote}
          </p>
        )}

        {archAssets.length > 0 && (
          <div className="text-center py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
              {archAssets.map(({ arch, asset, label }) => {
                const isActive = arch === currentArch;
                const isAvailable = asset !== null;
                const cls = isAvailable
                  ? `inline-flex flex-col items-center gap-1 px-5 py-3 rounded-lg border-2 transition-colors text-sm font-semibold ${
                      isActive
                        ? "bg-[var(--color-breeze-blue)] border-[var(--color-breeze-blue)] text-white shadow-lg shadow-[var(--color-breeze-blue)]/20"
                        : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--color-breeze-blue)]/60 hover:text-[var(--fg)]"
                    }`
                  : "inline-flex flex-col items-center gap-1 px-5 py-3 rounded-lg border-2 border-[var(--border)] text-[var(--fg-subtle)] text-sm font-semibold opacity-50 cursor-not-allowed";

                return asset ? (
                  <a
                    key={arch}
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      // also flip the visible terminal arch to match
                      if (!isActive) {
                        e.preventDefault();
                        setArch(arch);
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
                  <span key={arch} className={cls} title="Asset not yet built for this architecture">
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
            {current.downloadHint && (
              <p className="text-xs text-[var(--fg-muted)] mt-3">
                {current.downloadHint} · click to download. Use the buttons to switch
                architecture below.
              </p>
            )}
            {activeAsset?.sha256 && (
              <ChecksumBlock hash={activeAsset.sha256} fileName={activeAsset.name} />
            )}
          </div>
        )}

        {archAssets.length > 0 && (
          <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-[var(--fg-subtle)]">
            <span className="flex-1 h-px bg-[var(--border)]" />
            <span>Or step-by-step in the terminal ({currentArch})</span>
            <span className="flex-1 h-px bg-[var(--border)]" />
          </div>
        )}

        {steps.map((step, i) => {
          const key = `${current.id}-${currentArch}-${i}`;
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
                  className="absolute top-2 right-2 px-2.5 py-1.5 text-xs rounded bg-[var(--card)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
                  aria-label="Copy"
                >
                  {copied === key ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          );
        })}

        {current.note && (
          <p className="text-sm text-[var(--fg-muted)] flex items-start gap-2 pt-1">
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
              {current.note}{" "}
              {(current.id === "fedora" ||
                current.id === "ubuntu" ||
                current.id === "debian") && (
                <a
                  href={releaseHtmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-breeze-blue)] hover:underline"
                >
                  All assets →
                </a>
              )}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
