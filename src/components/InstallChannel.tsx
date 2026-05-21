import { useState } from "react";
import InstallTabs, { type ArchPair } from "./InstallTabs";
import UniversalInstall from "./UniversalInstall";
import type { ObsTarget } from "../config/repo";

export interface ChannelBundle {
  tag: string;
  htmlUrl: string;
  universal: ArchPair;
}

interface Props {
  stable: ChannelBundle | null;
  prerelease: ChannelBundle | null;
  releasesUrl: string;
  /** Base for release-download URLs, e.g.
   * "https://github.com/<owner>/<repo>/releases/download". Threaded through to
   * the download children so mock fallback URLs follow the repo config. */
  releaseDownloadBase: string;
  /** OBS targets discovered at build time, threaded to the openSUSE tab. */
  obsTargets: ObsTarget[];
}

type Channel = "stable" | "prerelease";

export default function InstallChannel({ stable, prerelease, releasesUrl, releaseDownloadBase, obsTargets }: Props) {
  // Start the user on whichever channel is available; defaults to stable.
  const initialChannel: Channel = stable ? "stable" : prerelease ? "prerelease" : "stable";
  const [channel, setChannel] = useState<Channel>(initialChannel);

  // If the chosen channel went away (build-time fetch failure, race) fall
  // back to whichever bundle we actually have.
  const active =
    channel === "prerelease" && prerelease
      ? prerelease
      : channel === "stable" && stable
        ? stable
        : stable ?? prerelease;

  if (!active) {
    return (
      <p className="text-center text-sm text-[var(--fg-muted)]">
        No releases available yet — check the{" "}
        <a href={releasesUrl} target="_blank" rel="noopener noreferrer" className="text-[#3daee9] hover:underline">
          releases page
        </a>.
      </p>
    );
  }

  const fallbackUrl = active.htmlUrl ?? releasesUrl;

  // Always render both buttons. Each disables when its bundle is missing
  // so the UI shape stays consistent and users can see when a channel is
  // simply not published yet (vs the feature being unavailable).
  const stableButton = (
    <button
      role="tab"
      aria-selected={channel === "stable"}
      aria-disabled={!stable}
      disabled={!stable}
      onClick={() => stable && setChannel("stable")}
      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        !stable
          ? "text-[var(--fg-subtle)] border border-transparent opacity-50 cursor-not-allowed"
          : channel === "stable"
            ? "bg-[var(--color-breeze-blue)]/15 text-[#3daee9] border border-[var(--color-breeze-blue)]/30 shadow-sm shadow-[#3daee9]/15 cursor-pointer"
            : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--color-breeze-blue)]/5 border border-transparent cursor-pointer active:scale-[0.97]"
      }`}
      title={!stable ? "No stable release published yet" : undefined}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          !stable
            ? "bg-[#3daee9]/30"
            : channel === "stable"
              ? "bg-[#3daee9] animate-pulse"
              : "bg-[#3daee9]/40"
        }`}
        aria-hidden="true"
      />
      <span>
        <span className="opacity-70 font-normal">Stable</span>{" "}
        <span className="tabular-nums">{stable ? `v${stable.tag}` : "—"}</span>
      </span>
    </button>
  );

  const prereleaseButton = (
    <button
      role="tab"
      aria-selected={channel === "prerelease"}
      aria-disabled={!prerelease}
      disabled={!prerelease}
      onClick={() => prerelease && setChannel("prerelease")}
      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        !prerelease
          ? "text-[var(--fg-subtle)] border border-transparent opacity-50 cursor-not-allowed"
          : channel === "prerelease"
            ? "bg-[#e67e22]/15 text-[#f5a35e] border border-[#e67e22]/40 shadow-sm shadow-[#e67e22]/15 cursor-pointer"
            : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[#e67e22]/5 border border-transparent cursor-pointer active:scale-[0.97]"
      }`}
      title={!prerelease ? "No pre-release available right now" : undefined}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          !prerelease
            ? "bg-[#e67e22]/30"
            : channel === "prerelease"
              ? "bg-[#e67e22] animate-pulse"
              : "bg-[#e67e22]/40"
        }`}
        aria-hidden="true"
      />
      <span>
        <span className="opacity-70 font-normal">Pre-release</span>{" "}
        <span className="tabular-nums">{prerelease ? `v${prerelease.tag}` : "none"}</span>
      </span>
    </button>
  );

  const helperText = channel === "stable"
    ? "Current stable release — recommended for most users."
    : "Testing channel — please report any issues before the final release.";

  return (
    <>
      <div className="max-w-2xl mx-auto mb-6">
        <div className="text-center mb-2">
          <p className="text-xs uppercase tracking-wider text-[var(--fg-muted)] font-semibold">
            Select release channel
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Release channel"
          className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--canvas-deep)] border border-[var(--border)]"
        >
          {stableButton}
          {prereleaseButton}
        </div>
        <p className="text-center text-xs text-[var(--fg-muted)] mt-2">
          {helperText}
        </p>
      </div>

      {/* Key on the active tag so React remounts this subtree when the
          channel switches, re-triggering the fade-in animation. */}
      <div key={active.tag} className="install-channel-fade">
        <InstallTabs
          prerelease={channel === "prerelease"}
          obsTargets={obsTargets}
          universalSlot={
            <UniversalInstall
              releasesUrl={releasesUrl}
              releaseHtmlUrl={fallbackUrl}
              universal={active.universal}
              channelTag={active.tag}
              releaseDownloadBase={releaseDownloadBase}
            />
          }
        />
      </div>

      <style>{`
        .install-channel-fade {
          animation: channelFadeIn 280ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes channelFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .install-channel-fade { animation: none; }
        }
      `}</style>
    </>
  );
}
