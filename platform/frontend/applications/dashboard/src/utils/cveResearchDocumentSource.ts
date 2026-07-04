import type { CveResearchDocumentResponseDto } from "../api/generated";

export type CveResearchDocumentSource = CveResearchDocumentResponseDto["source"];

const SOURCE_BADGE_CLASS = "border-white/50 bg-white/10 text-white";

const SOURCE_LABELS: Record<CveResearchDocumentSource, string> = {
  agent_lookup: "Agent lookup",
  user_upload: "User upload",
  chat_summary: "Chat summary",
  nvd_api_fetch: "NVD API",
  epss_api_fetch: "EPSS API",
};

export function researchDocumentSourceBadgeClass(_source: CveResearchDocumentSource): string {
  return SOURCE_BADGE_CLASS;
}

export function researchDocumentSourceLabel(source: CveResearchDocumentSource): string {
  return SOURCE_LABELS[source] ?? source;
}
