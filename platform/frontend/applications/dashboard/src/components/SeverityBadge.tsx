import { severityBadgeClass, severityLabel, type CveSeverity } from "../utils/cveSeverity";

type SeverityBadgeProps = {
  severity: CveSeverity;
};

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${severityBadgeClass(severity)}`}>
      {severityLabel(severity)}
    </span>
  );
}

