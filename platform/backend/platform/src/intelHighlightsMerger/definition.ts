import { z } from "zod";
import {
    IntelHighlightsResultSchema,
    IntelKevListedSchema,
    IntelNvdHighlightSchema,
    IntelKevHighlightSchema,
    IntelEpssHighlightSchema,
    type PlatformSeverity,
} from "./schema.js";
import {
    NvdCpeMatchSchema,
    NvdCves20ResponseSchema,
    NvdCveItemSchema,
    zNode,
} from "../apiClients/nvd_cve/schema.js";
import { EpssApiResponseSchema } from "../apiClients/epss/schema.js";
import { CisaKevVulnerabilitySchema } from "../apiClients/cisa_kev_catalog/schema.js";

type NvdCveItem = z.infer<typeof NvdCveItemSchema>;
type IntelNvdHighlight = z.infer<typeof IntelNvdHighlightSchema>;
type IntelEpssHighlight = z.infer<typeof IntelEpssHighlightSchema>;
type NvdCpeMatch = z.infer<typeof NvdCpeMatchSchema>;

/** Cap CPE rows stored in `intel_highlights` JSONB. */
const MAX_CPE_MATCHES_IN_INTEL = 500;

const CWE_TOKEN = /CWE-\d+/gi;

/**
 * Unique CWE ids from NVD `weaknesses[].description` strings, in first-seen order
 * (English descriptions preferred within each weakness block).
 */
export function extractCweIdsFromNvd(cve: NvdCveItem): string[] {
    const weaknesses = cve.weaknesses;
    if (!weaknesses?.length) return [];

    const seen = new Set<string>();
    const out: string[] = [];

    for (const w of weaknesses) {
        const descs = w.description ?? [];
        const ordered = [...descs].sort((a, b) => {
            if (a.lang === "en" && b.lang !== "en") return -1;
            if (a.lang !== "en" && b.lang === "en") return 1;
            return 0;
        });
        for (const d of ordered) {
            const matches = d.value.matchAll(new RegExp(CWE_TOKEN.source, "gi"));
            for (const m of matches) {
                const id = m[0].toUpperCase();
                if (seen.has(id)) continue;
                seen.add(id);
                out.push(id);
            }
        }
    }
    return out;
}

function collectCpeMatchesFromNvd(cve: NvdCveItem): NvdCpeMatch[] {
    const out: NvdCpeMatch[] = [];
    const seen = new Set<string>();

    function walkNode(node: z.infer<typeof zNode>) {
        for (const m of node.cpeMatch ?? []) {
            const key = `${m.matchCriteriaId}:${m.criteria}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            out.push(m);
            if (out.length >= MAX_CPE_MATCHES_IN_INTEL) {
                return;
            }
        }
        for (const child of node.nodes ?? []) {
            walkNode(child);
            if (out.length >= MAX_CPE_MATCHES_IN_INTEL) {
                return;
            }
        }
    }

    for (const cfg of cve.configurations ?? []) {
        for (const n of cfg.nodes ?? []) {
            walkNode(n);
            if (out.length >= MAX_CPE_MATCHES_IN_INTEL) {
                break;
            }
        }
        if (out.length >= MAX_CPE_MATCHES_IN_INTEL) {
            break;
        }
    }
    return out;
}

function isCveId(s: string): boolean {
    return /^CVE-\d{4}-\d{4,}$/.test(s);
}

export function findMatchingNvdCveItem(
    vulnerabilities: z.infer<typeof NvdCves20ResponseSchema>["vulnerabilities"],
    cveId: string,
): NvdCveItem | null {
    if (!isCveId(cveId)) return null;
    for (const v of vulnerabilities) {
        if (v.cve.id === cveId) return v.cve;
    }
    return null;
}

function pickDescription(cve: NvdCveItem): string {
    const en = cve.descriptions.find((d) => d.lang === "en");
    if (en) return en.value;
    return cve.descriptions[0]!.value;
}

function severityFromV3BaseSeverity(raw: string): PlatformSeverity {
    const u = raw.toUpperCase();
    if (u === "NONE") return "UNKNOWN";
    if (u === "LOW" || u === "MEDIUM" || u === "HIGH" || u === "CRITICAL") return u;
    return "UNKNOWN";
}

function severityFromV2BaseScore(score: number): PlatformSeverity {
    if (score >= 9.0 && score <= 10.0) return "CRITICAL";
    if (score >= 7.0 && score < 9.0) return "HIGH";
    if (score >= 4.0 && score < 7.0) return "MEDIUM";
    if (score >= 0.0 && score < 4.0) return "LOW";
    return "UNKNOWN";
}

function normalizeV2SeverityLabel(raw: string): PlatformSeverity | null {
    const u = raw.toUpperCase();
    if (u === "LOW" || u === "MEDIUM" || u === "HIGH" || u === "CRITICAL") return u;
    return null;
}

/** Narrowed metrics shape (NVD `cve.metrics` is loose in the API schema). */
type NvdCvssMetricV31 = {
    type: "Primary" | "Secondary";
    cvssData: { version: "3.1"; vectorString: string; baseScore: number; baseSeverity: string };
};
type NvdCvssMetricV30 = {
    type: "Primary" | "Secondary";
    cvssData: { version: "3.0"; vectorString: string; baseScore: number; baseSeverity: string };
};
type NvdCvssMetricV2 = {
    type: "Primary" | "Secondary";
    cvssData: { version: "2.0"; vectorString: string; baseScore: number };
    baseSeverity?: string;
};

type NvdMetricsNarrow = {
    cvssMetricV31?: NvdCvssMetricV31[];
    cvssMetricV30?: NvdCvssMetricV30[];
    cvssMetricV2?: NvdCvssMetricV2[];
};

function asMetricsNarrow(m: NvdCveItem["metrics"]): NvdMetricsNarrow {
    return (m ?? {}) as NvdMetricsNarrow;
}

function firstPrimaryV31(metrics: NvdCveItem["metrics"]): NvdCvssMetricV31 | undefined {
    const arr = asMetricsNarrow(metrics).cvssMetricV31;
    if (!arr) return undefined;
    return arr.find((e) => e.type === "Primary");
}

function firstPrimaryV30(metrics: NvdCveItem["metrics"]): NvdCvssMetricV30 | undefined {
    const arr = asMetricsNarrow(metrics).cvssMetricV30;
    if (!arr) return undefined;
    return arr.find((e) => e.type === "Primary");
}

/** CVSS 2.0: first Primary, else first entry in the array. */
function firstPrimaryOrFirstV2(metrics: NvdCveItem["metrics"]): NvdCvssMetricV2 | undefined {
    const arr = asMetricsNarrow(metrics).cvssMetricV2;
    if (!arr?.length) return undefined;
    const primary = arr.find((e) => e.type === "Primary");
    return primary ?? arr[0];
}

/**
 * Picks Primary CVSS for display and platform severity
 * (3.1 Primary → 3.0 Primary → 2.0 Primary / first).
 */
export function pickPrimaryCvssAndSeverity(cve: NvdCveItem): {
    primaryCvss: IntelNvdHighlight["primaryCvss"];
    severity: PlatformSeverity;
} {
    const m = cve.metrics;
    const v31 = firstPrimaryV31(m);
    if (v31) {
        const sev = severityFromV3BaseSeverity(v31.cvssData.baseSeverity);
        return {
            primaryCvss: {
                version: "3.1",
                vectorString: v31.cvssData.vectorString,
                baseScore: v31.cvssData.baseScore,
                baseSeverity: sev,
            },
            severity: sev,
        };
    }
    const v30 = firstPrimaryV30(m);
    if (v30) {
        const sev = severityFromV3BaseSeverity(v30.cvssData.baseSeverity);
        return {
            primaryCvss: {
                version: "3.0",
                vectorString: v30.cvssData.vectorString,
                baseScore: v30.cvssData.baseScore,
                baseSeverity: sev,
            },
            severity: sev,
        };
    }
    const v2 = firstPrimaryOrFirstV2(m);
    if (v2) {
        const fromLabel = v2.baseSeverity ? normalizeV2SeverityLabel(v2.baseSeverity) : null;
        const sev: PlatformSeverity = fromLabel ?? severityFromV2BaseScore(v2.cvssData.baseScore);
        return {
            primaryCvss: {
                version: "2.0",
                vectorString: v2.cvssData.vectorString,
                baseScore: v2.cvssData.baseScore,
                baseSeverity: sev,
            },
            severity: sev,
        };
    }
    return { primaryCvss: null, severity: "UNKNOWN" };
}

function projectCisaOnNvd(cve: NvdCveItem): IntelNvdHighlight["cisaOnNvd"] {
    const out: NonNullable<IntelNvdHighlight["cisaOnNvd"]> = {};
    if (cve.cisaExploitAdd !== undefined) out.cisaExploitAdd = cve.cisaExploitAdd;
    if (cve.cisaActionDue !== undefined) out.cisaActionDue = cve.cisaActionDue;
    if (cve.cisaRequiredAction !== undefined) out.cisaRequiredAction = cve.cisaRequiredAction;
    if (cve.cisaVulnerabilityName !== undefined) out.cisaVulnerabilityName = cve.cisaVulnerabilityName;
    return Object.keys(out).length > 0 ? out : undefined;
}

export function projectNvdHighlight(cve: NvdCveItem): IntelNvdHighlight {
    const { primaryCvss } = pickPrimaryCvssAndSeverity(cve);
    const cisaOnNvd = projectCisaOnNvd(cve);
    const cpeMatches = collectCpeMatchesFromNvd(cve);
    const cweIds = extractCweIdsFromNvd(cve);
    const base: IntelNvdHighlight = {
        description: pickDescription(cve),
        primaryCvss,
        cweIds,
        cpeMatches,
    };
    if (cisaOnNvd !== undefined) {
        return IntelNvdHighlightSchema.parse({ ...base, cisaOnNvd });
    }
    return IntelNvdHighlightSchema.parse(base);
}

export function severityFromNvdCveItem(cve: NvdCveItem): PlatformSeverity {
    return pickPrimaryCvssAndSeverity(cve).severity;
}

/**
 * Wraps a parsed CISA catalog row as `IntelKevHighlight` **listed** branch (caller supplies the
 * correct row for this CVE after DB resolution).
 */
export function intelKevListedFromCisaEntry(
    entry: z.infer<typeof CisaKevVulnerabilitySchema>,
): z.infer<typeof IntelKevListedSchema> {
    const base = {
        listed: true as const,
        cveID: entry.cveID,
        vendorProject: entry.vendorProject,
        product: entry.product,
        vulnerabilityName: entry.vulnerabilityName,
        dateAdded: entry.dateAdded,
        shortDescription: entry.shortDescription,
        requiredAction: entry.requiredAction,
        dueDate: entry.dueDate,
    };
    if (entry.knownRansomwareCampaignUse !== undefined) {
        return IntelKevListedSchema.parse({
            ...base,
            knownRansomwareCampaignUse: entry.knownRansomwareCampaignUse,
        });
    }
    return IntelKevListedSchema.parse(base);
}

function epssRowForCve(
    response: z.infer<typeof EpssApiResponseSchema>,
    cveId: string,
): IntelEpssHighlight | null {
    const row = response.data.find((d) => d.cve === cveId);
    if (!row) return null;
    const { ["time-series"]: _ts, ...rest } = row;
    return rest as IntelEpssHighlight;
}

/**
 * Applies optional per-source **updates** onto prior intel highlights + severity.
 *
 * For each source, behaviour is **subtree replace**, not field-wise merge with the old subtree:
 * when new data applies, the entire `highlights.nvd` / `highlights.epss` / `highlights.kev` value
 * is replaced. `null` inputs mean **skip that source** (keep the previous subtree from `oldEntry`).
 *
 * @param oldEntry Prior `severity` + `highlights` (each subtree may be `null`).
 * @param cveId Platform CVE id — strict match on NVD `vulnerabilities[].cve.id` and EPSS `data[].cve`.
 * @param nvdEntry `null` = skip NVD (keep prior `highlights.nvd` and `severity`).
 * @param epssEntry `null` = skip EPSS.
 * @param kevEntry `null` = skip KEV (keep prior `highlights.kev`). Otherwise caller passes
 *        `IntelKevHighlight` (`{ listed: false }` or listed branch, typically built via
 *        {@link intelKevListedFromCisaEntry}); the merger **replaces** `highlights.kev` as-is
 *        (no CISA parsing or `cveID` checks here).
 */
export function mergeIntelHighlights(
    oldEntry: z.infer<typeof IntelHighlightsResultSchema>,
    cveId: string,
    nvdEntry: z.infer<typeof NvdCves20ResponseSchema> | null,
    epssEntry: z.infer<typeof EpssApiResponseSchema> | null,
    kevEntry: z.infer<typeof IntelKevHighlightSchema> | null,
): z.infer<typeof IntelHighlightsResultSchema> {
    let severity = oldEntry.severity;
    const highlights = { ...oldEntry.highlights };

    if (nvdEntry !== null) {
        const cve = findMatchingNvdCveItem(nvdEntry.vulnerabilities, cveId);
        if (cve) {
            highlights.nvd = projectNvdHighlight(cve);
            severity = severityFromNvdCveItem(cve);
        }
    }

    if (epssEntry !== null) {
        const epss = epssRowForCve(epssEntry, cveId);
        if (epss) {
            highlights.epss = epss;
        }
    }

    if (kevEntry !== null) {
        highlights.kev = kevEntry;
    }

    return { severity, highlights };
}
