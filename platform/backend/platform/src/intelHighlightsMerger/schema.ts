import { z } from "zod";
import {
    NvdCpeMatchSchema,
    NvdCveItemSchema,
    NvdCweIdSchema,
    NvdLangStringSchema,
} from "../apiClients/nvd_cve/schema.js";
import { EpssDataRowSchema } from "../apiClients/epss/schema.js";
import { CisaKevVulnerabilitySchema } from "../apiClients/cisa_kev_catalog/schema.js";

/** Optional CISA-on-NVD fields (same keys as NVD `cve` object). */
const IntelNvdCisaOnNvdSchema = z
    .strictObject({
        cisaExploitAdd: NvdCveItemSchema.shape.cisaExploitAdd,
        cisaActionDue: NvdCveItemSchema.shape.cisaActionDue,
        cisaRequiredAction: NvdCveItemSchema.shape.cisaRequiredAction,
        cisaVulnerabilityName: NvdCveItemSchema.shape.cisaVulnerabilityName,
    })
    .partial();

/** Single Primary CVSS block chosen for display (3.1 → 3.0 → 2.0). */
export const IntelNvdPrimaryCvssSchema = z.strictObject({
    version: z.enum(["3.1", "3.0", "2.0"]),
    vectorString: z.string(),
    baseScore: z.number(),
    baseSeverity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]),
});

export const IntelNvdHighlightSchema = z.strictObject({
    /** Picked English (or first) description — same `value` type as {@link NvdLangStringSchema}. */
    description: NvdLangStringSchema.shape.value,
    primaryCvss: IntelNvdPrimaryCvssSchema.nullable(),
    cisaOnNvd: IntelNvdCisaOnNvdSchema.optional(),
    /**
     * Parsed from NVD `weaknesses` — see {@link NvdCweIdSchema}.
     * `.default([])` accepts older stored rows that predate this field.
     */
    cweIds: z.array(NvdCweIdSchema).default([]),
    /** NVD `cpeMatch` rows (same shape as API); capped when collected. Not parsed into vendor/product strings. */
    cpeMatches: z.array(NvdCpeMatchSchema),
});

/** EPSS highlight: current scores only (no `time-series`). */
export const IntelEpssHighlightSchema = EpssDataRowSchema.omit({ "time-series": true });

/**
 * Curated KEV slice when the CVE is listed (full **replace** of `highlights.kev`, not a merge
 * with the previous object).
 */
export const IntelKevListedSchema = z.strictObject({
    listed: z.literal(true),
    cveID: CisaKevVulnerabilitySchema.shape.cveID,
    vendorProject: CisaKevVulnerabilitySchema.shape.vendorProject,
    product: CisaKevVulnerabilitySchema.shape.product,
    vulnerabilityName: CisaKevVulnerabilitySchema.shape.vulnerabilityName,
    dateAdded: CisaKevVulnerabilitySchema.shape.dateAdded,
    shortDescription: CisaKevVulnerabilitySchema.shape.shortDescription,
    requiredAction: CisaKevVulnerabilitySchema.shape.requiredAction,
    dueDate: CisaKevVulnerabilitySchema.shape.dueDate,
    knownRansomwareCampaignUse: CisaKevVulnerabilitySchema.shape.knownRansomwareCampaignUse.optional(),
});

export const IntelKevNotListedSchema = z.strictObject({
    listed: z.literal(false),
});

export const IntelKevHighlightSchema = z.discriminatedUnion("listed", [IntelKevListedSchema, IntelKevNotListedSchema]);

export const IntelHighlightsSchema = z.strictObject({
    nvd: IntelNvdHighlightSchema.nullable(),
    epss: IntelEpssHighlightSchema.nullable(),
    kev: IntelKevHighlightSchema.nullable(),
});

export const PlatformSeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

/** DB / TypeORM column type for `cves.severity` (same values as {@link PlatformSeveritySchema}). */
export type PlatformSeverity = z.infer<typeof PlatformSeveritySchema>;

/** DB / TypeORM column type for `cves.intel_highlights` JSONB. */
export type IntelHighlightsColumn = z.infer<typeof IntelHighlightsSchema>;

/** Tuple for TypeORM `enum` column option (kept in sync with {@link PlatformSeveritySchema}). */
export const PLATFORM_SEVERITY_ENUM: readonly PlatformSeverity[] = PlatformSeveritySchema.options;

export const IntelHighlightsResultSchema = z.strictObject({
    severity: PlatformSeveritySchema,
    highlights: IntelHighlightsSchema,
});