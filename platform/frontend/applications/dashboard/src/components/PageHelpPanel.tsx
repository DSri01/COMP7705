import { useState } from "react";
import { SafeMarkdown } from "./markdown/SafeMarkdown";

type PageHelpPanelProps = {
  markdown: string;
  /** Collapsed label when `title` is omitted. */
  label?: string;
  defaultExpanded?: boolean;
};

export default function PageHelpPanel({
  markdown,
  label = "Instructions",
  defaultExpanded = false,
}: PageHelpPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <aside
      className="panel border-[var(--accent-cyan)]/25"
      aria-label={label}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
          {label}
        </p>
        <button
          className="neon-button text-xs"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Hide instructions" : "Show instructions"}
        </button>
      </div>
      {expanded ? (
        <div className="mt-3 max-h-[28rem] overflow-auto border-t border-[var(--border)]/60 pt-3 text-sm text-[var(--text-secondary)]">
          <SafeMarkdown content={markdown} />
        </div>
      ) : (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Expand for a short guide to this page.
        </p>
      )}
    </aside>
  );
}
