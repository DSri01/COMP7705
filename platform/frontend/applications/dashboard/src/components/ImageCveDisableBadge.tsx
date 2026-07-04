type DisableState =
  | { state: "enabled" }
  | { state: "disabled"; reason: string };

type ImageCveDisableBadgeProps = {
  disableState: DisableState;
};

export default function ImageCveDisableBadge({ disableState }: ImageCveDisableBadgeProps) {
  if (disableState.state === "disabled") {
    return (
      <span className="inline-flex rounded-full border border-[var(--status-critical)]/50 bg-[var(--status-critical)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--status-critical)]">
        Disabled
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-[var(--status-low)]/50 bg-[var(--status-low)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--status-low)]">
      Enabled
    </span>
  );
}

