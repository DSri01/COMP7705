/**
 * Zod schemas for FIRST EPSS API (`GET https://api.first.org/data/v1/epss`).
 *
 * References:
 * - https://api.first.org/epss/
 * - https://www.first.org/epss/articles/prob_percentile_bins
 */
import { z } from "zod";

/** One historical EPSS point when `scope=time-series` is used. */
const zEpssTimeSeriesPoint = z.strictObject({
    /** EPSS probability score for this calendar day (API may return string or number). */
    epss: z.coerce.number(),
    /** Percentile rank across all CVEs for this day (API may return string or number). */
    percentile: z.coerce.number(),
    /** ISO calendar date `YYYY-MM-DD` for this score. */
    date: z.string(),
});

/**
 * One CVE row inside the `data` array (current score and optional history).
 * `.loose()` allows FIRST to add new fields without breaking parsing.
 */
export const EpssDataRowSchema = z
    .object({
        /** CVE identifier, e.g. `CVE-2024-3094`. */
        cve: z.string(),
        /**
         * EPSS score: estimated probability (0–1) that the CVE is exploited in the wild
         * in the next 30 days. FIRST returns this as a decimal string in JSON.
         */
        epss: z.coerce.number(),
        /**
         * Percentile of this CVE’s EPSS relative to all CVEs (0–1); see FIRST article on
         * probability vs percentile.
         */
        percentile: z.coerce.number(),
        /** Score date for the primary `epss` / `percentile` values (`YYYY-MM-DD`). */
        date: z.string().optional(),
        /** Present when `scope=time-series`: daily EPSS + percentile series. */
        "time-series": z.array(zEpssTimeSeriesPoint).optional(),
    })
    .loose();

/**
 * Top-level EPSS API JSON envelope (same shape with or without `envelope=true` on the URL).
 * Hyphenated keys match FIRST’s JSON field names exactly.
 */
export const EpssApiResponseSchema = z.strictObject({
    /** Human-readable status, e.g. `OK`. */
    status: z.string(),
    /** Numeric status code (typically HTTP-like, e.g. 200). */
    "status-code": z.number(),
    /** EPSS API schema / payload version string from FIRST. */
    version: z.string(),
    /** Access tier for this response, e.g. `public`. */
    access: z.string(),
    /** Number of rows returned in `data` for this query (before client-side slicing). */
    total: z.number(),
    /** Pagination: starting index of this page. */
    offset: z.number(),
    /** Pagination: maximum rows per page for this request. */
    limit: z.number(),
    /** CVE rows matching the query (one or many when batching with `cve=a,b,c`). */
    data: z.array(EpssDataRowSchema),
});

// export function parseEpssApiResponse(
//     data: unknown,
// ): z.infer<typeof EpssApiResponseSchema> {
//     return EpssApiResponseSchema.parse(data);
// }

// export function safeParseEpssApiResponse(data: unknown) {
//     return EpssApiResponseSchema.safeParse(data);
// }
