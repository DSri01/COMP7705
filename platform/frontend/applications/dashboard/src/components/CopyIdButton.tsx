import { useCallback, useEffect, useRef, useState } from "react";
import { writeClipboard } from "../utils/clipboard";

type CopyState = "idle" | "copied" | "failed";

type Props = {
  value: string;
  /** Used in aria-label, e.g. "CVE ID" or "project ID". */
  idKind?: string;
  className?: string;
};

export function CopyIdButton({ value, idKind = "ID", className = "" }: Props) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const onClick = useCallback(() => {
    void writeClipboard(value).then((ok) => {
      setState(ok ? "copied" : "failed");
      if (resetTimer.current !== undefined) {
        window.clearTimeout(resetTimer.current);
      }
      resetTimer.current = window.setTimeout(() => setState("idle"), 1500);
    });
  }, [value]);

  const title =
    state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : `Copy ${idKind}`;

  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center rounded border border-[var(--border)]/80 bg-[var(--text-primary)]/[0.03] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] transition-colors hover:border-[var(--accent-cyan)]/60 hover:text-[var(--accent-cyan)] ${className}`}
      aria-label={`Copy ${idKind}: ${value}`}
      title={title}
      onClick={onClick}
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Failed" : "Copy"}
    </button>
  );
}
