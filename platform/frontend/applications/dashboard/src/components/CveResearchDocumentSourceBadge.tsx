import {
  researchDocumentSourceBadgeClass,
  researchDocumentSourceLabel,
  type CveResearchDocumentSource,
} from "../utils/cveResearchDocumentSource";

type CveResearchDocumentSourceBadgeProps = {
  source: CveResearchDocumentSource;
};

export default function CveResearchDocumentSourceBadge({ source }: CveResearchDocumentSourceBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${researchDocumentSourceBadgeClass(source)}`}
    >
      {researchDocumentSourceLabel(source)}
    </span>
  );
}
