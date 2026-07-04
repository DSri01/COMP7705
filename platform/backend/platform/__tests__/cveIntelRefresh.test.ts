/// <reference types="node" />
import { describe, expect, test, jest, beforeEach, afterEach } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import type { DataSource, EntityManager } from "typeorm";
import { EPSS_APIClient, type EpssFetcher } from "../src/apiClients/epss/definition.js";
import { EpssApiResponseSchema } from "../src/apiClients/epss/schema.js";
import { NVD_CVE_APIClient, type NvdCveFetcher } from "../src/apiClients/nvd_cve/definition.js";
import { NvdCves20ResponseSchema } from "../src/apiClients/nvd_cve/schema.js";
import { CisaKevVulnerabilitySchema } from "../src/apiClients/cisa_kev_catalog/schema.js";
import type { Cve } from "../src/db/entities/cves/definition.js";
import { Cve as CveEntity } from "../src/db/entities/cves/definition.js";
import { CveResearchDocument } from "../src/db/entities/cve_research_documents/definition.js";
import { KevCatalogEntry } from "../src/db/entities/kev_catalog_entries/definition.js";
import {
    refreshCveIntel,
    loadKevHighlightForCve,
} from "../src/cveIntelRefresh/definition.js";
import {
    findMatchingNvdCveItem,
    severityFromNvdCveItem,
} from "../src/intelHighlightsMerger/definition.js";

const CVE = "CVE-2010-3333" as const;
const NOW = 424242n;

const nvdFixtureJson = JSON.parse(
    readFileSync(join("__testResources__", "api_responses", "nvd_api", `${CVE}.json`), "utf-8"),
);
const epssFixtureJson = JSON.parse(
    readFileSync(join("__testResources__", "api_responses", "epss_api", `${CVE}.json`), "utf-8"),
);

const nvdFixture = NvdCves20ResponseSchema.parse(nvdFixtureJson);
const epssFixture = EpssApiResponseSchema.parse(epssFixtureJson);

const kevVulnerability = CisaKevVulnerabilitySchema.parse({
    cveID: CVE,
    vendorProject: "Microsoft",
    product: "Office",
    vulnerabilityName: "Stack buffer overflow",
    dateAdded: "2010-09-14",
    shortDescription: "Buffer overflow",
    requiredAction: "Apply updates",
    dueDate: "2010-12-14",
});

function mockFetchForNvdEpssFixtures(): void {
    jest.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.includes("services.nvd.nist.gov")) {
            return { ok: true, json: () => Promise.resolve(nvdFixtureJson) } as Response;
        }
        if (url.includes("api.first.org")) {
            return { ok: true, json: () => Promise.resolve(epssFixtureJson) } as Response;
        }
        throw new Error(`unexpected fetch URL: ${url}`);
    });
}

function baseCve(overrides: Partial<Cve> = {}): Cve {
    return {
        cveId: CVE,
        severity: "UNKNOWN",
        intelHighlights: null,
        intelLastAttemptAtUnixSeconds: 0n,
        intelUpdatedAtUnixSeconds: 0n,
        researchSummary: "",
        ...overrides,
    } as Cve;
}

function buildMockDataSource(args: {
    initialCve: Cve | null;
    /** Row returned by latest-KEV query (`getOne`), or `null` if none. */
    kevGetOneResult: KevCatalogEntry | null;
}) {
    let storedCve: Cve | null = args.initialCve ? { ...args.initialCve } : null;
    const savedDocs: Array<Record<string, unknown>> = [];

    const kevQueryBuilder = {
        innerJoinAndSelect: () => kevQueryBuilder,
        where: () => kevQueryBuilder,
        orderBy: () => kevQueryBuilder,
        getOne: async () => args.kevGetOneResult,
    };

    const dataSource = {
        getRepository: (entity: unknown) => {
            if (entity === CveEntity) {
                return {
                    findOne: async () =>
                        storedCve
                            ? ({
                                  ...storedCve,
                                  intelHighlights:
                                      storedCve.intelHighlights === null
                                          ? null
                                          : JSON.parse(JSON.stringify(storedCve.intelHighlights)),
                              } as Cve)
                            : null,
                };
            }
            throw new Error(`unexpected dataSource.getRepository: ${String(entity)}`);
        },
        manager: {
            getRepository: (entity: unknown) => {
                if (entity === KevCatalogEntry) {
                    return { createQueryBuilder: () => kevQueryBuilder };
                }
                throw new Error(`unexpected manager.getRepository: ${String(entity)}`);
            },
        },
        transaction: async (cb: (m: EntityManager) => Promise<void>) => {
            const mgr = {
                getRepository: (entity: unknown) => {
                    if (entity === CveEntity) {
                        return {
                            findOne: async () =>
                                storedCve
                                    ? ({
                                          ...storedCve,
                                          intelHighlights:
                                              storedCve.intelHighlights === null
                                                  ? null
                                                  : JSON.parse(JSON.stringify(storedCve.intelHighlights)),
                                      } as Cve)
                                    : null,
                            save: async (c: Cve) => {
                                storedCve = { ...c };
                                return c;
                            },
                        };
                    }
                    if (entity === CveResearchDocument) {
                        return {
                            create: (partial: object) => partial,
                            save: async (doc: object) => {
                                savedDocs.push(doc as Record<string, unknown>);
                                return doc;
                            },
                        };
                    }
                    throw new Error(`unexpected transaction.getRepository: ${String(entity)}`);
                },
            };
            await cb(mgr as unknown as EntityManager);
        },
    };

    return {
        dataSource: dataSource as unknown as DataSource,
        getStoredCve: () => storedCve,
        getSavedDocs: () => savedDocs,
    };
}

describe("loadKevHighlightForCve", () => {
    test("returns { listed: false } when no KEV catalog row exists", async () => {
        const qb = {
            innerJoinAndSelect: () => qb,
            where: () => qb,
            orderBy: () => qb,
            getOne: async () => null,
        };
        const manager = {
            getRepository: () => ({ createQueryBuilder: () => qb }),
        } as unknown as EntityManager;

        const highlight = await loadKevHighlightForCve(manager, CVE);
        expect(highlight).toEqual({ listed: false });
    });

    test("returns listed branch from DB vulnerability payload", async () => {
        const qb = {
            innerJoinAndSelect: () => qb,
            where: () => qb,
            orderBy: () => qb,
            getOne: async () =>
                ({
                    vulnerability: kevVulnerability,
                }) as KevCatalogEntry,
        };
        const manager = {
            getRepository: () => ({ createQueryBuilder: () => qb }),
        } as unknown as EntityManager;

        const highlight = await loadKevHighlightForCve(manager, CVE);
        expect(highlight.listed).toBe(true);
        if (highlight.listed !== true) {
            throw new Error("expected listed KEV");
        }
        expect(highlight.cveID).toBe(CVE);
        expect(highlight.vendorProject).toBe("Microsoft");
    });
});

describe("refreshCveIntel", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("returns cve_not_found and does not call HTTP when CVE row is absent", async () => {
        const nvd: NvdCveFetcher = {
            getCVEData: jest.fn() as NvdCveFetcher["getCVEData"],
        };
        const epss: EpssFetcher = {
            getCVE_EPSSData: jest.fn() as EpssFetcher["getCVE_EPSSData"],
        };
        const { dataSource } = buildMockDataSource({ initialCve: null, kevGetOneResult: null });

        const result = await refreshCveIntel(dataSource, { nvd, epss }, CVE, () => NOW);

        expect(result).toEqual({ ok: false, reason: "cve_not_found" });
        expect(nvd.getCVEData).not.toHaveBeenCalled();
        expect(epss.getCVE_EPSSData).not.toHaveBeenCalled();
    });

    test("merges NVD + EPSS from mocked fetch fixtures and KEV from DB; updates CVE and appends research docs", async () => {
        mockFetchForNvdEpssFixtures();
        const kevRow = { vulnerability: kevVulnerability } as KevCatalogEntry;
        const { dataSource, getStoredCve, getSavedDocs } = buildMockDataSource({
            initialCve: baseCve(),
            kevGetOneResult: kevRow,
        });

        const nvdClient = new NVD_CVE_APIClient(null);
        const epssClient = new EPSS_APIClient();

        const result = await refreshCveIntel(dataSource, { nvd: nvdClient, epss: epssClient }, CVE, () => NOW);

        expect(result).toEqual({ ok: true });
        expect(fetch).toHaveBeenCalled();

        const stored = getStoredCve();
        expect(stored).not.toBeNull();
        const nvdItem = findMatchingNvdCveItem(nvdFixture.vulnerabilities, CVE);
        expect(nvdItem).not.toBeNull();
        const expectedSeverity = severityFromNvdCveItem(nvdItem!);
        expect(stored!.severity).toBe(expectedSeverity);
        expect(stored!.intelLastAttemptAtUnixSeconds).toBe(NOW);
        expect(stored!.intelUpdatedAtUnixSeconds).toBe(NOW);
        expect(stored!.intelHighlights?.nvd).not.toBeNull();
        expect(stored!.intelHighlights?.nvd?.cpeMatches?.length).toBe(8);
        expect(stored!.intelHighlights?.epss).not.toBeNull();
        expect(stored!.intelHighlights?.kev?.listed).toBe(true);

        const docs = getSavedDocs();
        expect(docs).toHaveLength(2);
        const sources = docs.map((d) => d.source).sort();
        expect(sources).toEqual(["epss_api_fetch", "nvd_api_fetch"]);
        const nvdDoc = docs.find((d) => d.source === "nvd_api_fetch");
        expect(JSON.parse(String(nvdDoc!.content))).toEqual(nvdFixture);
        const epssDoc = docs.find((d) => d.source === "epss_api_fetch");
        expect(JSON.parse(String(epssDoc!.content))).toEqual(epssFixture);
    });

    test("when NVD client fails, preserves prior NVD slice and skips nvd research doc; EPSS still applies", async () => {
        jest.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
            const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
            if (url.includes("api.first.org")) {
                return { ok: true, json: () => Promise.resolve(epssFixtureJson) } as Response;
            }
            throw new Error(`unexpected fetch URL: ${url}`);
        });

        const priorNvd = findMatchingNvdCveItem(nvdFixture.vulnerabilities, CVE);
        expect(priorNvd).not.toBeNull();

        const { dataSource, getStoredCve, getSavedDocs } = buildMockDataSource({
            initialCve: baseCve({
                severity: severityFromNvdCveItem(priorNvd!),
                intelHighlights: {
                    nvd: { description: "prior", primaryCvss: null, cweIds: [], cpeMatches: [] },
                    epss: null,
                    kev: { listed: false },
                },
            }),
            kevGetOneResult: null,
        });

        const nvd: NvdCveFetcher = {
            getCVEData: jest.fn(async () => ({
                success: false as const,
                error: new Error("NVD unavailable"),
            })) as NvdCveFetcher["getCVEData"],
        };
        const epssClient = new EPSS_APIClient();

        const result = await refreshCveIntel(dataSource, { nvd, epss: epssClient }, CVE, () => NOW);

        expect(result).toEqual({ ok: true });
        expect(nvd.getCVEData).toHaveBeenCalledWith(CVE);

        const stored = getStoredCve();
        expect(stored!.intelHighlights?.nvd?.description).toBe("prior");
        expect(stored!.intelHighlights?.epss).not.toBeNull();

        const docs = getSavedDocs();
        expect(docs).toHaveLength(1);
        expect(docs[0]!.source).toBe("epss_api_fetch");
    });
});
