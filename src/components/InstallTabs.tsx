import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  badge?: string;
  commands: { label?: string; code: string }[];
  note?: string;
}

interface Props {
  releasesUrl: string;
}

export default function InstallTabs({ releasesUrl }: Props) {
  const tabs: Tab[] = [
    {
      id: "arch",
      label: "Arch Linux",
      badge: "Official",
      commands: [
        { label: "Install via yay", code: "yay -S plasma6-applets-appgrid" },
        { label: "Or via paru", code: "paru -S plasma6-applets-appgrid" },
      ],
      note: "Maintained by the author. Works on EndeavourOS, CachyOS, Manjaro, Garuda.",
    },
    {
      id: "fedora",
      label: "Fedora",
      commands: [
        {
          label: "Download .rpm from Releases",
          code: `# Grab latest from:\n# ${releasesUrl}\nsudo dnf install ./plasma6-applets-appgrid-*.rpm`,
        },
      ],
    },
    {
      id: "ubuntu",
      label: "Ubuntu / Debian",
      commands: [
        {
          label: "Ubuntu 25.04+ / Debian 13+",
          code: `# Grab latest .deb from:\n# ${releasesUrl}\nsudo apt install ./plasma6-applets-appgrid_*.deb`,
        },
      ],
    },
    {
      id: "opensuse",
      label: "openSUSE",
      badge: "Community",
      commands: [
        {
          label: "Add OBS repo",
          code: "# Maintained by @JMarcosHP01\n# https://build.opensuse.org/package/show/home:JMarcosHP01/plasma6-applet-appgrid",
        },
      ],
    },
    {
      id: "gentoo",
      label: "Gentoo",
      badge: "Community",
      commands: [
        {
          label: "Add overlay & emerge",
          code: "# Maintained by @mnalmahmud\n# https://github.com/mnalmahmud/mnalmahmud-overlay\nsudo eselect repository add mnalmahmud-overlay git https://github.com/mnalmahmud/mnalmahmud-overlay.git\nsudo emaint sync -r mnalmahmud-overlay\nsudo emerge -av kde-misc/plasma6-applet-appgrid",
        },
      ],
      note: "Requires eselect-repository. Maintained by @mnalmahmud.",
    },
  ];

  const [active, setActive] = useState(tabs[0].id);
  const [copied, setCopied] = useState<string | null>(null);

  const current = tabs.find((t) => t.id === active)!;

  const copy = async (key: string, text: string) => {
    const stripped = text
      .split("\n")
      .filter((l) => !l.trim().startsWith("#"))
      .join("\n")
      .trim();
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
              {t.label}
              {t.badge && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded uppercase tracking-wide ${
                    t.badge === "Official"
                      ? "bg-[#27ae60]/20 text-[#5fd48a] border border-[#27ae60]/40"
                      : "bg-[#9b59b6]/20 text-[#c084d6] border border-[#9b59b6]/40"
                  }`}
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

      <div className="p-5 md:p-6 space-y-4">
        {current.commands.map((cmd, i) => {
          const key = `${current.id}-${i}`;
          return (
            <div key={key}>
              {cmd.label && (
                <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-2 font-medium">
                  {cmd.label}
                </div>
              )}
              <div className="relative group">
                <pre className="bg-[var(--canvas-deep)] border border-[var(--border)] rounded-lg p-4 pr-12 overflow-x-auto text-sm font-mono leading-relaxed text-[var(--fg)]">
                  <code>{cmd.code}</code>
                </pre>
                <button
                  onClick={() => copy(key, cmd.code)}
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
            {current.note}
          </p>
        )}
      </div>
    </div>
  );
}
