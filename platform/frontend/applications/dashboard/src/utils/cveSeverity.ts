import type { ValidatedCveResponse } from "../api/cvesApi";

export type CveSeverity = ValidatedCveResponse["severity"];

const SEVERITY_STYLES: Record<CveSeverity, string> = {
  CRITICAL:
    "border-[var(--status-critical)]/60 bg-[var(--status-critical)]/10 text-[var(--status-critical)]",
  HIGH: "border-[var(--status-high)]/60 bg-[var(--status-high)]/10 text-[var(--status-high)]",
  MEDIUM: "border-[var(--status-medium)]/60 bg-[var(--status-medium)]/10 text-[var(--status-medium)]",
  LOW: "border-[var(--status-low)]/60 bg-[var(--status-low)]/10 text-[var(--status-low)]",
  UNKNOWN: "border-[var(--border)] bg-[var(--text-muted)]/10 text-[var(--text-secondary)]",
};

export function severityBadgeClass(severity: CveSeverity): string {
  return SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.UNKNOWN;
}

export function severityLabel(severity: CveSeverity): string {
  return severity.charAt(0) + severity.slice(1).toLowerCase();
}
