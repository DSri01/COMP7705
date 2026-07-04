import type { ValidatedVexStateKind } from "../api/imageCvesApi";

type ImageCveStateBadgeProps = {
  vexStateKind: ValidatedVexStateKind;
};

const STATE_LABELS: Record<ValidatedVexStateKind, string> = {
  under_investigation_fresh: "Under Investigation (Fresh)",
  under_investigation_expired: "Under Investigation (Expired)",
  under_investigation_carry_forward: "Under Investigation (Carry Forward)",
  not_affected: "Not Affected",
  affected: "Affected",
};

const STATE_STYLES: Record<ValidatedVexStateKind, string> = {
  under_investigation_fresh: "border-[var(--text-muted)]/60 bg-[var(--text-muted)]/10 text-[var(--text-secondary)]",
  under_investigation_expired: "border-[var(--status-medium)]/60 bg-[var(--status-medium)]/10 text-[var(--status-medium)]",
  under_investigation_carry_forward: "border-[var(--accent-cyan)]/60 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]",
  not_affected: "border-[var(--status-low)]/60 bg-[var(--status-low)]/10 text-[var(--status-low)]",
  affected: "border-[var(--status-critical)]/60 bg-[var(--status-critical)]/10 text-[var(--status-critical)]",
};

export default function ImageCveStateBadge({ vexStateKind }: ImageCveStateBadgeProps) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATE_STYLES[vexStateKind]}`}>
      {STATE_LABELS[vexStateKind]}
    </span>
  );
}

