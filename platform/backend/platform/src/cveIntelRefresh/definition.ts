import type { DataSource, EntityManager } from "typeorm";
import type { z } from "zod";
import type { EpssFetcher } from "../apiClients/epss/definition.js";
import type { NvdCveFetcher } from "../apiClients/nvd_cve/definition.js";
import { Cve } from "../db/entities/cves/definition.js";
import { CveResearchDocument } from "../db/entities/cve_research_documents/definition.js";
import { KevCatalogEntry } from "../db/entities/kev_catalog_entries/definition.js";
import {
    IntelHighlightsResultSchema,
    IntelHighlightsSchema,
    IntelKevHighlightSchema,
} from "../intelHighlightsMerger/schema.js";
import {
    intelKevListedFromCisaEntry,
    mergeIntelHighlights,
} from "../intelHighlightsMerger/definition.js";

const RESEARCH_DOC_TITLE_NVD = "NVD CVE API 2.0 response";
const RESEARCH_DOC_TITLE_EPSS = "FIRST EPSS API response";

const EMPTY_HIGHLIGHTS = IntelHighlightsSchema.parse({
    nvd: null,
    epss: null,
    kev: null,
});

export type CveIntelRefreshDeps = {
    nvd: NvdCveFetcher;
    epss: EpssFetcher;
};

export type CveIntelRefreshResult = { ok: true } | { ok: false; reason: "cve_not_found" };

function entryFromCve(cve: Cve): z.infer<typeof IntelHighlightsResultSchema> {
    return IntelHighlightsResultSchema.parse({
        severity: cve.severity,
        highlights: cve.intelHighlights ?? EMPTY_HIGHLIGHTS,
    });
}

/**
 * Resolves KEV intel for a CVE from the latest {@link KevCatalogEntry} row (ordered by parent
 * fetch `fetchedAtUnixSeconds` descending), not from the CISA HTTP API.
 */
export async function loadKevHighlightForCve(
    manager: EntityManager,
    cveId: string,
): Promise<z.infer<typeof IntelKevHighlightSchema>> {
    const row = await manager
        .getRepository(KevCatalogEntry)
        .createQueryBuilder("e")
        .innerJoinAndSelect("e.fetch", "f")
        .where("e.cveId = :cveId", { cveId })
        .orderBy("f.fetchedAtUnixSeconds", "DESC")
        .getOne();

    if (!row) {
        return IntelKevHighlightSchema.parse({ listed: false });
    }
    return intelKevListedFromCisaEntry(row.vulnerability);
}

/**
 * Refreshes NVD + EPSS intel via HTTP clients, merges KEV from {@link KevCatalogEntry} in the DB,
 * updates {@link Cve}, and appends {@link CveResearchDocument} rows for successful NVD/EPSS payloads.
 *
 * @param getCurrentTimeUnixSeconds — Injected clock; pass `getCurrentTimeUnixSeconds` from `../utils/time.js` at the app boundary.
 */
export async function refreshCveIntel(
    dataSource: DataSource,
    deps: CveIntelRefreshDeps,
    cveId: string,
    getCurrentTimeUnixSeconds: () => bigint,
): Promise<CveIntelRefreshResult> {
    const cveRepo = dataSource.getRepository(Cve);
    const existing = await cveRepo.findOne({ where: { cveId } });
    if (!existing) {
        return { ok: false, reason: "cve_not_found" };
    }

    const kevHighlight = await loadKevHighlightForCve(dataSource.manager, cveId);

    const [nvdResult, epssResult] = await Promise.all([
        deps.nvd.getCVEData(cveId),
        deps.epss.getCVE_EPSSData(cveId),
    ]);

    const nvdPayload = nvdResult.success ? nvdResult.data : null;
    const epssPayload = epssResult.success ? epssResult.data : null;

    const now = getCurrentTimeUnixSeconds();

    await dataSource.transaction(async (manager) => {
        const txCveRepo = manager.getRepository(Cve);
        const fresh = await txCveRepo.findOne({ where: { cveId } });
        if (!fresh) {
            throw new Error(`CVE row disappeared during refresh: ${cveId}`);
        }

        const merged = mergeIntelHighlights(entryFromCve(fresh), cveId, nvdPayload, epssPayload, kevHighlight);

        fresh.severity = merged.severity;
        fresh.intelHighlights = merged.highlights;
        fresh.intelLastAttemptAtUnixSeconds = now;
        fresh.intelUpdatedAtUnixSeconds = now;
        await txCveRepo.save(fresh);

        const docRepo = manager.getRepository(CveResearchDocument);

        if (nvdResult.success) {
            await docRepo.save(
                docRepo.create({
                    cve: fresh,
                    source: "nvd_api_fetch",
                    title: RESEARCH_DOC_TITLE_NVD,
                    content: JSON.stringify(nvdResult.data),
                    createdAtUnixSeconds: now,
                }),
            );
        }

        if (epssResult.success) {
            await docRepo.save(
                docRepo.create({
                    cve: fresh,
                    source: "epss_api_fetch",
                    title: RESEARCH_DOC_TITLE_EPSS,
                    content: JSON.stringify(epssResult.data),
                    createdAtUnixSeconds: now,
                }),
            );
        }
    });

    return { ok: true };
}
