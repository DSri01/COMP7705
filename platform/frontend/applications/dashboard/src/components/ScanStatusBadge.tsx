import { scanResultBadgeClass, scanResultLabel, type ScanResultCode } from "../utils/containerImageScanStatus";

type Props = {
  code: ScanResultCode;
};

export default function ScanStatusBadge({ code }: Props) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${scanResultBadgeClass(code)}`}
    >
      {scanResultLabel(code)}
    </span>
  );
}
