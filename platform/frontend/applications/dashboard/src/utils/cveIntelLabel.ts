import type { ValidatedCveResponse } from "../api/cvesApi";

const DESCRIPTION_PREVIEW_MAX = 88;

/**
 * Short label for CVE list rows: KEV title when listed, else CISA-on-NVD name, else truncated NVD description.
 */
export function getCveListIntelSummary(cve: ValidatedCveResponse): string {
  const h = cve.intelHighlights;
  if (!h) {
    return "—";
  }

  const kev = h.kev;
  if (kev?.listed === true) {
    const name = kev.vulnerabilityName.trim();
    if (name.length > 0) {
      return name;
    }
  }

  const cisaName = h.nvd?.cisaOnNvd?.cisaVulnerabilityName?.trim();
  if (cisaName && cisaName.length > 0) {
    return cisaName;
  }

  const desc = h.nvd?.description?.trim();
  if (desc && desc.length > 0) {
    if (desc.length <= DESCRIPTION_PREVIEW_MAX) {
      return desc;
    }
    return `${desc.slice(0, DESCRIPTION_PREVIEW_MAX - 1)}…`;
  }

  return "—";
}
