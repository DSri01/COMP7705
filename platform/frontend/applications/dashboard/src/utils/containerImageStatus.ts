import type { ValidatedContainerImage } from "../api/containerImagesApi";

export type FileStatus = ValidatedContainerImage["fileStatus"];

const fileStatusStyles: Record<FileStatus, string> = {
  awaiting_upload:
    "border-[var(--accent-cyan)]/50 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]",
  uploading:
    "border-[var(--status-medium)]/60 bg-[var(--status-medium)]/10 text-[var(--status-medium)]",
  ready:
    "border-[var(--status-low)]/60 bg-[var(--status-low)]/10 text-[var(--status-low)]",
  failed:
    "border-[var(--status-critical)]/60 bg-[var(--status-critical)]/10 text-[var(--status-critical)]",
};

const fileStatusLabels: Record<FileStatus, string> = {
  awaiting_upload: "Awaiting upload",
  uploading: "Uploading",
  ready: "Ready",
  failed: "Failed",
};

export function fileStatusBadgeClass(status: FileStatus): string {
  return fileStatusStyles[status];
}

export function fileStatusLabel(status: FileStatus): string {
  return fileStatusLabels[status];
}
