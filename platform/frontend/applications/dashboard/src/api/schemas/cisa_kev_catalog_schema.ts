/**
 * Copied from ../../../../../backend/platform/src/apiClients/cisa_kev_catalog/schema.ts
 */

/**
 * Zod schemas for the CISA Known Exploited Vulnerabilities (KEV) catalog JSON feed.
 *
 * References:
 * - https://www.cisa.gov/known-exploited-vulnerabilities-catalog
 * - https://www.cisa.gov/known-exploited-vulnerabilities
 * - https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities_schema.json
 */
import { z } from "zod";

/** CVE id pattern from CISA JSON Schema (`CVE-YYYY` + 4–19 digit sequence). */
const zCisaKevCveId = z.string().regex(/^CVE-\d{4}-\d{4,19}$/);

/** CWE id pattern: `CWE-` + digits (CISA schema uses digit class for CWE numbers). */
const zCisaKevCweId = z.string().regex(/^CWE-\d+$/);

/**
 * One KEV catalog entry (`$defs/vulnerability` in the official schema).
 * `.loose()` allows CISA to add columns before the published schema is updated.
 */
export const CisaKevVulnerabilitySchema = z
    .object({
        /** CVE identifier for this KEV listing. */
        cveID: zCisaKevCveId,
        /** Vendor or project name. */
        vendorProject: z.string(),
        /** Affected product name. */
        product: z.string(),
        /** Human-readable vulnerability title. */
        vulnerabilityName: z.string(),
        /** Date the CVE was added to the KEV catalog (`YYYY-MM-DD`). */
        dateAdded: z.string(),
        /** Short description of the issue. */
        shortDescription: z.string(),
        /** Required remediation action text (BOD 22-01 style guidance). */
        requiredAction: z.string(),
        /** Date by which the required action is due (`YYYY-MM-DD`). */
        dueDate: z.string(),
        /**
         * Whether this CVE is known to be used in ransomware campaigns (`Known` / `Unknown`),
         * per CISA field semantics when present.
         */
        knownRansomwareCampaignUse: z.string().optional(),
        /** Additional notes (often URLs to vendor advisories). */
        notes: z.string().optional(),
        /** Associated CWE identifiers when provided. */
        cwes: z.array(zCisaKevCweId).optional(),
    })
    .loose();

/**
 * Full KEV catalog JSON (`known_exploited_vulnerabilities.json`).
 * `title` appears in live feeds but is not listed in the schema `required` array; kept optional.
 */
export const CisaKevCatalogSchema = z
    .object({
        /** Catalog display title when present (e.g. “CISA Catalog of Known Exploited Vulnerabilities”). */
        title: z.string().optional(),
        /** Catalog version string from CISA (e.g. `2026.04.16`). */
        catalogVersion: z.string(),
        /** ISO date-time string when this JSON snapshot was released. */
        dateReleased: z.string(),
        /** Total KEV entries; should match `vulnerabilities.length` for a consistent export. */
        count: z.number().int(),
        /** All KEV rows in this file. */
        vulnerabilities: z.array(CisaKevVulnerabilitySchema),
    })
    .loose();

// export function parseCisaKevCatalog(
//     data: unknown,
// ): z.infer<typeof CisaKevCatalogSchema> {
//     return CisaKevCatalogSchema.parse(data);
// }

// export function safeParseCisaKevCatalog(data: unknown) {
//     return CisaKevCatalogSchema.safeParse(data);
// }
