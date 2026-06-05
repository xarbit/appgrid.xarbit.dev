import { useState } from "react";

interface Props {
  hash: string;
  fileName: string;
}

/**
 * Renders a small expandable "Verify SHA256" section under a download button.
 * Closed by default to avoid noise; one click reveals the hash + the
 * `sha256sum -c` command. Both have copy buttons.
 */
export default function ChecksumBlock({ hash, fileName }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"hash" | "cmd" | null>(null);

  const verifyCmd = `echo "${hash}  ${fileName}" | sha256sum -c -`;

  const copy = async (key: "hash" | "cmd", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard blocked
    }
  };

  return (
    <div className="mt-3 text-left max-w-xl mx-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        aria-expanded={open}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#27ae60]">
          <path d="M12 2l9 4v6c0 5-3.5 9.5-9 10-5.5-.5-9-5-9-10V6l9-4z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        Verify SHA256
      </button>

      {open && (
        <div className="mt-2 space-y-2 p-3 rounded-lg bg-[var(--canvas-deep)] border border-[var(--border)]">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1">
              SHA256
            </div>
            <div className="flex items-start gap-2">
              <code className="flex-1 text-[11px] font-mono text-[var(--fg)] break-all leading-snug">
                {hash}
              </code>
              <button
                onClick={() => copy("hash", hash)}
                className="flex-shrink-0 px-2 py-1 text-[10px] btn-secondary"
              >
                {copied === "hash" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--fg-subtle)] mb-1">
              Verify after download
            </div>
            <div className="relative">
              <pre className="bg-[var(--card)] border border-[var(--border)] rounded p-2.5 pr-12 overflow-x-auto text-[11px] font-mono text-[var(--fg)] leading-snug">
                <code>{verifyCmd}</code>
              </pre>
              <button
                onClick={() => copy("cmd", verifyCmd)}
                className="absolute top-1.5 right-1.5 px-2 py-0.5 text-[10px] btn-secondary"
              >
                {copied === "cmd" ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
