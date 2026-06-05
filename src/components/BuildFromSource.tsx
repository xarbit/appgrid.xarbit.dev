import { useState } from "react";

interface Props {
  cloneUrl: string;
}

export default function BuildFromSource({ cloneUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const steps: { label: string; code: string }[] = [
    {
      label: "Clone & build",
      code: `git clone ${cloneUrl}\ncd plasma6-applet-appgrid\ncmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr\ncmake --build build -j$(nproc)\nsudo cmake --install build`,
    },
    {
      label: "Restart Plasma",
      code: "kquitapp6 plasmashell && kstart plasmashell",
    },
  ];

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
    <div id="build-from-source" className="breeze-card overflow-hidden mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-breeze-blue)]/15 border border-[var(--color-breeze-blue)]/30 grid place-items-center text-[var(--color-breeze-blue)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <div>
            <div className="font-medium text-sm">Build from source</div>
            <div className="text-xs text-[var(--fg-muted)]">
              For developers and distros without a pre-built package
            </div>
          </div>
        </div>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-[var(--fg-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-[var(--border)] p-5 space-y-4">
          {steps.map((s, i) => {
            const key = `src-${i}`;
            return (
              <div key={key}>
                <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)] mb-2 font-medium">
                  {s.label}
                </div>
                <div className="relative group">
                  <pre className="code-block border border-[var(--border)] rounded-lg p-4 pr-12 overflow-x-auto text-sm font-mono leading-relaxed text-[var(--fg)]">
                    <code>{s.code}</code>
                  </pre>
                  <button
                    onClick={() => copy(key, s.code)}
                    className="absolute top-2 right-2 px-2.5 py-1.5 text-xs btn-secondary"
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
    </div>
  );
}
