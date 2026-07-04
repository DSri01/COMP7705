import type { ValidatedContainerImage } from "../api/containerImagesApi";

export type ScanResultCode = ValidatedContainerImage["scanResultCode"];

const scanResultStyles: Record<ScanResultCode, string> = {
  ok: "border-[var(--status-low)]/60 bg-[var(--status-low)]/10 text-[var(--status-low)]",
  container_not_uploaded:
    "border-[var(--status-medium)]/60 bg-[var(--status-medium)]/10 text-[var(--status-medium)]",
  scanning: "border-[var(--accent-cyan)]/60 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]",
};

const scanResultLabels: Record<ScanResultCode, string> = {
  ok: "Scan OK",
  container_not_uploaded: "Container Not Uploaded",
  scanning: "Scanning",
};

export function scanResultBadgeClass(code: ScanResultCode): string {
  return scanResultStyles[code];
}

export function scanResultLabel(code: ScanResultCode): string {
  return scanResultLabels[code];
}
