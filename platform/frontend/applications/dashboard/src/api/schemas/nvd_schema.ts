/**
 * Copied from ../../../../../backend/platform/src/apiClients/nvd_cve/schema.ts
 */

/**
 * Zod schemas for NVD CVE API 2.0 JSON responses.
 *
 * References:
 * - https://nvd.nist.gov/developers/vulnerabilities
 * - https://csrc.nist.gov/schema/nvd/api/2.0/cve_api_json_2.0.schema
 * - https://csrc.nist.gov/schema/nvd/api/2.0/external/cvss-v3.1.json
 * - https://csrc.nist.gov/schema/nvd/api/2.0/external/cvss-v3.0.json
 * - https://csrc.nist.gov/schema/nvd/api/2.0/external/cvss-v2.0.json
 */
import { z } from "zod";

/** NIST `cve_id` pattern: `^CVE-[0-9]{4}-[0-9]{4,}$` */
const zCveId = z.string().regex(/^CVE-\d{4}-\d{4,}$/);

/** One `descriptions[]` / weakness `description[]` entry (NVD CVE API 2.0). */
export const NvdLangStringSchema = z.strictObject({
    lang: z.string(),
    value: z.string(),
});

const zReference = z.strictObject({
    url: z.string().min(1),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

const zCvssSeverityV3 = z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]);

/** CVSS 3.1 `cvssData` — required: version, vectorString, baseScore, baseSeverity (FIRST schema). */
const zCvssData31 = z
    .object({
        version: z.literal("3.1"),
        vectorString: z.string(),
        baseScore: z.number(),
        baseSeverity: zCvssSeverityV3,
    })
    .loose();

const zCvssMetricV31 = z.strictObject({
    source: z.string(),
    type: z.enum(["Primary", "Secondary"]),
    cvssData: zCvssData31,
    exploitabilityScore: z.number().optional(),
    impactScore: z.number().optional(),
});

/** CVSS 3.0 `cvssData` — required: version, vectorString, baseScore, baseSeverity. */
const zCvssData30 = z
    .object({
        version: z.literal("3.0"),
        vectorString: z.string(),
        baseScore: z.number(),
        baseSeverity: zCvssSeverityV3,
    })
    .loose();

const zCvssMetricV30 = z.strictObject({
    source: z.string(),
    type: z.enum(["Primary", "Secondary"]),
    cvssData: zCvssData30,
    exploitabilityScore: z.number().optional(),
    impactScore: z.number().optional(),
});

/** CVSS 2.0 `cvssData` — required: version, vectorString, baseScore (FIRST schema). */
const zCvssData20 = z
    .object({
        version: z.literal("2.0"),
        vectorString: z.string(),
        baseScore: z.number(),
    })
    .loose();

const zCvssMetricV2 = z.strictObject({
    source: z.string(),
    type: z.enum(["Primary", "Secondary"]),
    cvssData: zCvssData20,
    baseSeverity: z.string().optional(),
    exploitabilityScore: z.number().optional(),
    impactScore: z.number().optional(),
    acInsufInfo: z.boolean().optional(),
    obtainAllPrivilege: z.boolean().optional(),
    obtainUserPrivilege: z.boolean().optional(),
    obtainOtherPrivilege: z.boolean().optional(),
    userInteractionRequired: z.boolean().optional(),
});

/** CVSS 4.0 metric wrapper (NVD schema); `cvssData` shape is validated loosely for forward compatibility. */
const zCvssData40 = z
    .object({
        version: z.literal("4.0"),
    })
    .loose();

const zCvssMetricV40 = z.strictObject({
    source: z.string(),
    type: z.enum(["Primary", "Secondary"]),
    cvssData: zCvssData40,
});

const zMetrics = z
    .object({
        cvssMetricV40: z.array(zCvssMetricV40).optional(),
        cvssMetricV31: z.array(zCvssMetricV31).optional(),
        cvssMetricV30: z.array(zCvssMetricV30).optional(),
        cvssMetricV2: z.array(zCvssMetricV2).optional(),
    })
    .loose();

const zCveTag = z.looseObject({
    sourceIdentifier: z.string().optional(),
    tags: z
        .array(
            z.enum([
                "unsupported-when-assigned",
                "exclusively-hosted-service",
                "disputed",
            ]),
        )
        .optional(),
});

/** One NVD weakness block (`cve.weaknesses[]`). */
export const NvdWeaknessSchema = z.strictObject({
    source: z.string(),
    type: z.string(),
    description: z.array(NvdLangStringSchema),
});

/**
 * CWE identifier as in NVD weakness description text (e.g. `CWE-787`).
 * Curated `intel_highlights.nvd.cweIds` stores normalized uppercase `CWE-\d+` tokens.
 */
export const NvdCweIdSchema = z.string().regex(/^CWE-\d+$/);

/** One NVD `cpeMatch` entry (CPE 2.3 `criteria` URI + metadata). */
export const NvdCpeMatchSchema = z.strictObject({
    vulnerable: z.boolean(),
    criteria: z.string(),
    matchCriteriaId: z.uuid(),
    versionStartExcluding: z.string().optional(),
    versionStartIncluding: z.string().optional(),
    versionEndExcluding: z.string().optional(),
    versionEndIncluding: z.string().optional(),
});

/**
 * Configuration node: may contain `cpeMatch` and/or nested `nodes` (NVD supports nesting).
 * Uses a getter for `nodes` so the schema is recursive without `z.lazy` (avoids TS7022 on self-reference).
 */
export const zNode = z.looseObject({
    operator: z.enum(["AND", "OR"]),
    negate: z.boolean().optional(),
    cpeMatch: z.array(NvdCpeMatchSchema).optional(),
    get nodes() {
        return z.array(zNode).optional();
    },
});

const zConfig = z.strictObject({
    operator: z.enum(["AND", "OR"]).optional(),
    negate: z.boolean().optional(),
    nodes: z.array(zNode),
});

const zVendorComment = z.strictObject({
    organization: z.string(),
    comment: z.string(),
    lastModified: z.string(),
});

/**
 * Single CVE record (`cve_item` in NIST schema). Uses a loose object so NVD can add
 * new fields (e.g. ADP containers) without breaking parsing.
 */
export const NvdCveItemSchema = z.looseObject({
    id: zCveId,
    sourceIdentifier: z.string().optional(),
    vulnStatus: z.string().optional(),
    published: z.string(),
    lastModified: z.string(),
    evaluatorComment: z.string().optional(),
    evaluatorSolution: z.string().optional(),
    evaluatorImpact: z.string().optional(),
    cisaExploitAdd: z.string().optional(),
    cisaActionDue: z.string().optional(),
    cisaRequiredAction: z.string().optional(),
    cisaVulnerabilityName: z.string().optional(),
    cveTags: z.array(zCveTag).optional(),
    descriptions: z.array(NvdLangStringSchema).min(1),
    references: z.array(zReference),
    metrics: zMetrics.optional(),
    weaknesses: z.array(NvdWeaknessSchema).optional(),
    configurations: z.array(zConfig).optional(),
    vendorComments: z.array(zVendorComment).optional(),
});

const zDefCveItem = z.strictObject({
    cve: NvdCveItemSchema,
});

/**
 * Top-level response from `GET /rest/json/cves/2.0` (NVD CVE API 2.0).
 * `additionalProperties: false` on the root schema — modelled with `z.strictObject`.
 */
export const NvdCves20ResponseSchema = z.strictObject({
    resultsPerPage: z.number().int(),
    startIndex: z.number().int(),
    totalResults: z.number().int(),
    format: z.string(),
    version: z.string(),
    timestamp: z.string(),
    vulnerabilities: z.array(zDefCveItem),
});

// export function parseNvdCves20Response(
//     data: unknown,
// ): z.infer<typeof NvdCves20ResponseSchema> {
//     return NvdCves20ResponseSchema.parse(data);
// }

// export function safeParseNvdCves20Response(data: unknown) {
//     return NvdCves20ResponseSchema.safeParse(data);
// }
