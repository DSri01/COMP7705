import type { Cve } from '../../db/entities/cves/definition.js';
import type { PlatformReadToolContext } from '../context.js';

export type GetCveInput = {
    cveId: string;
};

/** Same mapping as `CvesController` / MCP `cveToResponsePayload`. */
export function cveToResponsePayload(cve: Cve) {
    return {
        cveId: cve.cveId,
        severity: cve.severity,
        intelHighlights: cve.intelHighlights,
        intelLastAttemptAtUnixSeconds: cve.intelLastAttemptAtUnixSeconds.toString(),
        intelUpdatedAtUnixSeconds: cve.intelUpdatedAtUnixSeconds.toString(),
        researchSummary: cve.researchSummary,
    };
}

/** Fetches one CVE; propagates Nest `NotFoundException` / `BadRequestException`. */
export async function getCve(ctx: PlatformReadToolContext, args: GetCveInput): Promise<Cve> {
    return ctx.cvesService.getById(args.cveId);
}

/** Pretty-printed JSON for MCP and agent adapters. */
export function serializeCve(cve: Cve): string {
    return JSON.stringify(cveToResponsePayload(cve), null, 2);
}
