import type { ValidatedImageCveSource } from "../api/imageCvesApi";

type ImageCveSourceBadgeProps = {
  source: ValidatedImageCveSource;
};

const SOURCE_STYLES: Record<ValidatedImageCveSource, string> = {
  fromScan: "border-[var(--accent-cyan)]/50 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]",
  manual: "border-[var(--accent-magenta)]/50 bg-[var(--accent-magenta)]/10 text-[var(--accent-magenta)]",
  fromChain: "border-[var(--status-medium)]/50 bg-[var(--status-medium)]/10 text-[var(--status-medium)]",
};

const SOURCE_LABELS: Record<ValidatedImageCveSource, string> = {
  fromScan: "From Scan",
  manual: "Manual",
  fromChain: "From Chain",
};

export default function ImageCveSourceBadge({ source }: ImageCveSourceBadgeProps) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${SOURCE_STYLES[source]}`}>
      {SOURCE_LABELS[source]}
    </span>
  );
}

