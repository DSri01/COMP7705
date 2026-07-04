import { fileStatusBadgeClass, fileStatusLabel, type FileStatus } from "../utils/containerImageStatus";

type Props = {
  status: FileStatus;
};

export default function FileStatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${fileStatusBadgeClass(status)}`}
    >
      {fileStatusLabel(status)}
    </span>
  );
}
