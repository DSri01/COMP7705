import { z } from "zod";
import { CvesService, type CreateCveDto } from "./generated";
import { IntelHighlightsSchema, PlatformSeveritySchema } from "./schemas/intelligence_highlights_schema";

/** Matches `CveResponseDto` after validating `intelHighlights` with {@link IntelHighlightsSchema}. */
export const cveResponseSchema = z.object({
    cveId: z.string(),
    severity: PlatformSeveritySchema,
    intelHighlights: IntelHighlightsSchema.nullable().optional(),
    intelLastAttemptAtUnixSeconds: z.string(),
    intelUpdatedAtUnixSeconds: z.string(),
    researchSummary: z.string(),
});

export type ValidatedCveResponse = z.infer<typeof cveResponseSchema>;

/** Aligned with backend `assertCanonicalCveId` / `CreateCveDto`. */
export const CanonicalCveIdRegex = /^CVE-\d{4}-\d{4,}$/;

export function normalizeCanonicalCveId(raw: string): string | null {
    const normalized = raw.trim().toUpperCase();
    return CanonicalCveIdRegex.test(normalized) ? normalized : null;
}

export function parseCveResponse(raw: unknown): ValidatedCveResponse {
    return cveResponseSchema.parse(raw);
}

export async function listCves(offset = 0, limit = 100): Promise<ValidatedCveResponse[]> {
    const raw = await CvesService.cvesControllerList(offset, limit);
    if (!Array.isArray(raw)) {
        throw new Error("Invalid API response: expected an array of CVEs");
    }
    return raw.map((row) => parseCveResponse(row));
}

export async function getCveById(cveId: string): Promise<ValidatedCveResponse> {
    const raw = await CvesService.cvesControllerGetById(cveId);
    return parseCveResponse(raw);
}

export async function createCve(body: CreateCveDto): Promise<ValidatedCveResponse> {
    const raw = await CvesService.cvesControllerCreate(body);
    return parseCveResponse(raw);
}

export async function refreshCveIntel(cveId: string): Promise<ValidatedCveResponse> {
    const raw = await CvesService.cvesControllerRefreshIntel(cveId);
    return parseCveResponse(raw);
}

export async function updateCveResearchSummary(
    cveId: string,
    researchSummary: string,
): Promise<ValidatedCveResponse> {
    const raw = await CvesService.cvesControllerUpdateResearchSummary(cveId, { researchSummary });
    return parseCveResponse(raw);
}
