import { useState, useEffect, type ReactNode } from "react";
import DistroLogo from "./DistroLogo";
import type { ObsTarget } from "../config/repo";

type DistroKey =
  | "arch"
  | "fedora"
  | "ubuntu"
  | "universal"
  | "opensuse"
  | "gentoo";

/** Distro-brand tab ids — everything except the synthetic "universal" tab. */
type DistroBrandKey = Exclude<DistroKey, "universal">;

/** openSUSE package name on the OBS home:JMarcosHP01 project. */
const OBS_PACKAGE = "plasma6-applet-appgrid";

/** Build the zypper steps for a chosen OBS target. */
function obsSteps(target: ObsTarget | undefined): TerminalStep[] {
  if (!target) return [];
  return [
    {
      label: "1 — Add the OBS repository",
      code: `sudo zypper addrepo ${target.repoFile}`,
    },
    { label: "2 — Refresh", code: "sudo zypper refresh" },
    { label: "3 — Install", code: `sudo zypper install ${OBS_PACKAGE}` },
  ];
}

// Kept for InstallChannel's ChannelBundle.universal — the universal
// tarball is the one channel that is still a direct asset download.
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

interface Tab {
  id: DistroKey;
  label: string;
  color: string;
  /** Optional pill badge after the label (e.g. "Beta" on Universal). */
  badge?: string;
  /** Green callout — first-party build, published by the project's author. */
  official?: boolean;
  /** Community package — stable only; the tab is disabled on the pre-release channel. */
  stableOnly?: boolean;
  /** Yellow callout above the steps — community-package warning. */
  topWarning?: string;
  steps: TerminalStep[];
  note?: string;
  /** openSUSE only: build-time-discovered OBS targets. When present, the
   *  tab renders a target sub-selector and derives its steps from the
   *  selected target instead of using the static `steps`. */
  obsTargets?: ObsTarget[];
  /** Universal tab only: when true the panel renders the supplied
   *  `universalSlot` (the UniversalInstall widget) instead of steps. */
  isUniversal?: boolean;
}

// Tabs depend on the selected release channel: the PPA and Copr projects
// gain a "-rc" suffix on the pre-release channel. The AUR has no
// pre-release channel — that note changes instead.
function buildTabs(prerelease: boolean, obsTargets: ObsTarget[]): Tab[] {
  const sfx = prerelease ? "-rc" : "";
  return [
    {
      id: "arch",
      label: "Arch",
      color: "#1793d1",
      official: true,
      steps: [
        { label: "Via yay", code: `yay -S plasma6-applets-appgrid${sfx}` },
        { label: "Or via paru", code: `paru -S plasma6-applets-appgrid${sfx}` },
      ],
      note: prerelease
        ? "Official pre-release AUR package, maintained by the author — tracks the latest release candidate."
        : "Official AUR package, maintained by the author. Works on Arch and any derivative with AUR access — EndeavourOS, CachyOS, Manjaro, Garuda.",
    },
    {
      id: "fedora",
      label: "Fedora",
      color: "#3c6eb4",
      official: true,
      steps: [
        {
          label: "1 — Enable the Copr repository",
          code: `sudo dnf copr enable scujas/plasma-applet-appgrid${sfx}`,
        },
        { label: "2 — Install", code: "sudo dnf install plasma-applet-appgrid" },
      ],
      note: prerelease
        ? "Pre-release Copr — testing builds, expect rough edges. The stable repo is scujas/plasma-applet-appgrid."
        : "Copr is Fedora's community build service — this is the project's own repository, rebuilt on every release. Pre-release builds live in scujas/plasma-applet-appgrid-rc.",
    },
    {
      id: "ubuntu",
      label: "Ubuntu",
      color: "#e95420",
      official: true,
      steps: [
        {
          label: "1 — Add the PPA",
          code: `sudo add-apt-repository ppa:xarbit/plasma-applet-appgrid${sfx}`,
        },
        { label: "2 — Install", code: "sudo apt install plasma-applet-appgrid" },
      ],
      note: prerelease
        ? "Pre-release PPA — testing builds for Ubuntu 25.10, 26.04 and 26.10, expect rough edges. The stable PPA is ppa:xarbit/plasma-applet-appgrid."
        : "Builds for Ubuntu 25.10, 26.04 and 26.10. add-apt-repository refreshes the package list for you. Pre-release builds live in the plasma-applet-appgrid-rc PPA.",
    },
    {
      id: "universal",
      label: "Universal",
      color: "#e67e22",
      badge: "Beta",
      isUniversal: true,
      // Panel content is the UniversalInstall widget passed in as a slot.
      steps: [],
    },
    {
      id: "opensuse",
      label: "openSUSE",
      color: "#73ba25",
      stableOnly: true,
      topWarning:
        "Community-maintained on the openSUSE Build Service by @JMarcosHP01. Not an official AppGrid release — please report packaging issues to the OBS package page first.",
      obsTargets,
      // Fallback steps for the first target — overridden at render time
      // by the selected OBS target's steps.
      steps: obsSteps(obsTargets[0]),
      note: "Full package list and other distro builds on the OBS package page: https://build.opensuse.org/package/show/home:JMarcosHP01/plasma6-applet-appgrid",
    },
    {
      id: "gentoo",
      label: "Gentoo",
      color: "#54487a",
      stableOnly: true,
      topWarning:
        "Community-maintained overlay by @mnalmahmud. Not an official AppGrid release — please report packaging issues to the overlay first.",
      steps: [
        {
          label: "1 — Add the overlay",
          code: "sudo eselect repository add mnalmahmud-overlay git https://github.com/mnalmahmud/mnalmahmud-overlay.git",
        },
        { label: "2 — Sync", code: "sudo emaint sync -r mnalmahmud-overlay" },
        {
          label: "3 — Install",
          code: "sudo emerge -av kde-misc/plasma6-applet-appgrid",
        },
      ],
      note: "Requires eselect-repository. Overlay source: https://github.com/mnalmahmud/mnalmahmud-overlay",
    },
  ];
}

interface Props {
  /** true when the pre-release channel is selected — switches the PPA /
   *  Copr projects to their -rc variants. */
  prerelease: boolean;
  /** OBS targets discovered at build time for the openSUSE tab. */
  obsTargets: ObsTarget[];
  /** UniversalInstall widget — rendered as the panel of the Universal tab. */
  universalSlot: ReactNode;
}

export default function InstallTabs({ prerelease, obsTargets, universalSlot }: Props) {
  const tabs = buildTabs(prerelease, obsTargets);
  const [active, setActive] = useState<DistroKey>("arch");
  const [copied, setCopied] = useState<string | null>(null);
  // Selected openSUSE Build Service target — defaults to the first
  // (Tumbleweed when present).
  const [obsTargetId, setObsTargetId] = useState<string>(
    obsTargets[0]?.id ?? "",
  );

  const selected = tabs.find((t) => t.id === active)!;
  // A community (stable-only) tab can't be active on the pre-release
  // channel — fall back to the first tab.
  const current = prerelease && selected.stableOnly ? tabs[0] : selected;

  const isUniversal = !!current.isUniversal;
  // openSUSE tab: derive steps from the selected OBS target.
  const isObs = current.id === "opensuse" && !!current.obsTargets?.length;

  // The Universal panel lives inside a tab now — links to #universal-install
  // (the UniversalInstall widget's id) only resolve once that tab is active.
  // Select it when the hash points there, then scroll once it mounts.
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#universal-install") {
        setActive("universal");
        requestAnimationFrame(() => {
          document
            .getElementById("universal-install")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const obsTarget = isObs
    ? (current.obsTargets!.find((t) => t.id === obsTargetId) ??
       current.obsTargets![0])
    : undefined;
  const displaySteps = isObs ? obsSteps(obsTarget) : current.steps;

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

  return (
    <div className="breeze-card overflow-hidden">
      <div
        role="tablist"
        aria-label="Installation method"
        className="flex border-b border-[var(--border)] overflow-x-auto"
      >
        {tabs.map((t) => {
          const disabled = prerelease && !!t.stableOnly;
          const isActive = current.id === t.id;
          return (
            <button
              key={t.id}
              onClick={() => !disabled && setActive(t.id)}
              disabled={disabled}
              aria-selected={isActive}
              aria-disabled={disabled}
              role="tab"
              title={disabled ? "No pre-release builds — community-maintained, stable only" : undefined}
              className={`flex-1 min-w-[6rem] flex items-center justify-center gap-2 px-3 md:px-4 py-3.5 text-sm font-medium transition-all duration-200 relative whitespace-nowrap ${
                disabled
                  ? "text-[var(--fg-subtle)] opacity-40 cursor-not-allowed"
                  : isActive
                    ? "text-[var(--fg)] cursor-pointer"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--canvas-deep)]/50 cursor-pointer"
              }`}
              style={
                isActive && !disabled
                  ? { background: `color-mix(in srgb, ${t.color} 10%, transparent)` }
                  : undefined
              }
            >
              <span className="flex-shrink-0" style={{ color: t.color }} aria-hidden="true">
                {t.id === "universal" ? (
                  // Package-box glyph — DistroLogo only covers distro brands.
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16.5 9.4 7.5 4.21" />
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                ) : (
                  <DistroLogo distro={t.id as DistroBrandKey} size={16} />
                )}
              </span>
              <span>{t.label}</span>
              {t.badge && (
                <span className="px-1.5 py-0.5 text-[9px] rounded uppercase tracking-wide bg-[#e67e22]/20 text-[#f5a35e] border border-[#e67e22]/40 leading-none">
                  {t.badge}
                </span>
              )}
              {isActive && (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5"
                  style={{ background: t.color }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {isUniversal ? (
        <div className="p-4 md:p-5">{universalSlot}</div>
      ) : (
      <div className="p-5 md:p-6 space-y-5">
        {current.official && (
          <div className="rounded-lg border border-[#27ae60]/40 bg-[#27ae60]/10 p-3">
            <p className="text-sm text-[var(--fg-body)] flex items-start gap-2.5 leading-relaxed">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mt-0.5 flex-shrink-0 text-[#5fd48a]"
                aria-hidden="true"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>
                Official build — published by AppGrid's author and rebuilt
                from the project's own CI on every release.
              </span>
            </p>
          </div>
        )}

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

        {isObs && (
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-2 font-medium">
              Select your openSUSE version
            </div>
            <div role="tablist" aria-label="openSUSE version" className="flex flex-wrap gap-2">
              {current.obsTargets!.map((t) => {
                const sel = t.id === obsTarget?.id;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={sel}
                    onClick={() => setObsTargetId(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                      sel
                        ? "bg-[#73ba25]/15 text-[#8fce4a] border-[#73ba25]/40"
                        : "text-[var(--fg-muted)] hover:text-[var(--fg)] border-[var(--border)] hover:border-[#73ba25]/30"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            {obsTarget && (
              <p className="text-xs text-[var(--fg-muted)] mt-2">
                {obsTarget.version ? (
                  <>
                    OBS package{" "}
                    <span className="text-[var(--fg)] font-medium tabular-nums">
                      v{obsTarget.version}
                    </span>{" "}
                    for {obsTarget.label}.
                  </>
                ) : (
                  <>Package for {obsTarget.label}.</>
                )}
              </p>
            )}
          </div>
        )}

        {displaySteps.map((step, i) => {
          const key = `${current.id}-${obsTarget?.id ?? ""}-${i}`;
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
            <span>{current.note}</span>
          </p>
        )}
      </div>
      )}
    </div>
  );
}
