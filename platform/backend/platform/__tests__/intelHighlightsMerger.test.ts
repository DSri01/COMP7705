/// <reference types="node" />
import { describe, expect, test } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { NvdCveItemSchema, NvdCves20ResponseSchema } from "../src/apiClients/nvd_cve/schema.js";
import { EpssApiResponseSchema } from "../src/apiClients/epss/schema.js";
import { CisaKevVulnerabilitySchema } from "../src/apiClients/cisa_kev_catalog/schema.js";
import {
    IntelHighlightsResultSchema,
    IntelHighlightsSchema,
    IntelKevNotListedSchema,
} from "../src/intelHighlightsMerger/schema.js";
import {
    extractCweIdsFromNvd,
    findMatchingNvdCveItem,
    intelKevListedFromCisaEntry,
    mergeIntelHighlights,
    pickPrimaryCvssAndSeverity,
    projectNvdHighlight,
    severityFromNvdCveItem,
} from "../src/intelHighlightsMerger/definition.js";
import type { z } from "zod";

const CVE = "CVE-2021-44228";

function minimalCve(
    overrides: Partial<z.infer<typeof NvdCveItemSchema>> & Pick<z.infer<typeof NvdCveItemSchema>, "id">,
): z.infer<typeof NvdCveItemSchema> {
    return NvdCveItemSchema.parse({
        published: "2021-12-10T00:00:00.000",
        lastModified: "2021-12-10T00:00:00.000",
        descriptions: [{ lang: "en", value: "desc" }],
        references: [{ url: "https://example.invalid/cve", source: "nvd" }],
        ...overrides,
    });
}

function nvdEnvelope(cve: z.infer<typeof NvdCveItemSchema>): z.infer<typeof NvdCves20ResponseSchema> {
    return NvdCves20ResponseSchema.parse({
        resultsPerPage: 1,
        startIndex: 0,
        totalResults: 1,
        format: "NVD_CVE",
        version: "2.0",
        timestamp: "2021-12-10T00:00:00.000+00:00",
        vulnerabilities: [{ cve }],
    });
}

function epssEnvelope(rows: z.infer<typeof EpssApiResponseSchema>["data"]): z.infer<typeof EpssApiResponseSchema> {
    return EpssApiResponseSchema.parse({
        status: "OK",
        "status-code": 200,
        version: "1.0",
        access: "public",
        total: rows.length,
        offset: 0,
        limit: 10,
        data: rows,
    });
}

const emptyHighlights = IntelHighlightsSchema.parse({
    nvd: null,
    epss: null,
    kev: null,
});

function oldEntry(
    severity: z.infer<typeof IntelHighlightsResultSchema>["severity"],
    highlights: z.infer<typeof IntelHighlightsSchema>,
): z.infer<typeof IntelHighlightsResultSchema> {
    return IntelHighlightsResultSchema.parse({ severity, highlights });
}

describe("pickPrimaryCvssAndSeverity / severityFromNvdCveItem", () => {
    test("uses CVSS 3.1 Primary first when 3.1 has Primary (ignores 3.0 Primary for severity)", () => {
        const cve = minimalCve({
            id: CVE,
            metrics: {
                cvssMetricV31: [
                    {
                        source: "nvd",
                        type: "Secondary",
                        cvssData: {
                            version: "3.1",
                            vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                            baseScore: 9.8,
                            baseSeverity: "CRITICAL",
                        },
                    },
                    {
                        source: "nvd",
                        type: "Primary",
                        cvssData: {
                            version: "3.1",
                            vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N",
                            baseScore: 6.5,
                            baseSeverity: "MEDIUM",
                        },
                    },
                ],
                cvssMetricV30: [
                    {
                        source: "nvd",
                        type: "Primary",
                        cvssData: {
                            version: "3.0",
                            vectorString: "CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                            baseScore: 9.8,
                            baseSeverity: "CRITICAL",
                        },
                    },
                ],
            },
        });
        expect(pickPrimaryCvssAndSeverity(cve).severity).toBe("MEDIUM");
        expect(pickPrimaryCvssAndSeverity(cve).primaryCvss?.version).toBe("3.1");
        expect(severityFromNvdCveItem(cve)).toBe("MEDIUM");
    });

    test("falls back to CVSS 3.0 Primary when no 3.1 Primary exists", () => {
        const cve = minimalCve({
            id: CVE,
            metrics: {
                cvssMetricV31: [
                    {
                        source: "nvd",
                        type: "Secondary",
                        cvssData: {
                            version: "3.1",
                            vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                            baseScore: 9.8,
                            baseSeverity: "CRITICAL",
                        },
                    },
                ],
                cvssMetricV30: [
                    {
                        source: "nvd",
                        type: "Primary",
                        cvssData: {
                            version: "3.0",
                            vectorString: "CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L",
                            baseScore: 7.1,
                            baseSeverity: "HIGH",
                        },
                    },
                ],
            },
        });
        expect(pickPrimaryCvssAndSeverity(cve).severity).toBe("HIGH");
        expect(pickPrimaryCvssAndSeverity(cve).primaryCvss?.version).toBe("3.0");
    });

    test("falls back to CVSS 2.0 when no 3.1 / 3.0 Primary (uses first Primary in v2)", () => {
        const cve = minimalCve({
            id: CVE,
            metrics: {
                cvssMetricV31: [],
                cvssMetricV2: [
                    {
                        source: "nvd",
                        type: "Secondary",
                        cvssData: { version: "2.0", vectorString: "AV:N/AC:M/Au:N/C:P/I:P/A:P", baseScore: 6.8 },
                        baseSeverity: "MEDIUM",
                    },
                    {
                        source: "nvd",
                        type: "Primary",
                        cvssData: { version: "2.0", vectorString: "AV:N/AC:L/Au:N/C:C/I:C/A:C", baseScore: 10.0 },
                        baseSeverity: "HIGH",
                    },
                ],
            },
        });
        expect(pickPrimaryCvssAndSeverity(cve).severity).toBe("HIGH");
        expect(pickPrimaryCvssAndSeverity(cve).primaryCvss?.version).toBe("2.0");
    });

    test("CVSS 2.0: first array entry when no Primary (Secondary first)", () => {
        const cve = minimalCve({
            id: CVE,
            metrics: {
                cvssMetricV2: [
                    {
                        source: "nvd",
                        type: "Secondary",
                        cvssData: { version: "2.0", vectorString: "AV:L/AC:H/Au:N/C:N/I:N/A:N", baseScore: 1.2 },
                    },
                ],
            },
        });
        const { severity, primaryCvss } = pickPrimaryCvssAndSeverity(cve);
        expect(primaryCvss?.version).toBe("2.0");
        expect(severity).toBe("LOW");
    });

    test.each<[number, "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"]>([
        [9.5, "CRITICAL"],
        [7.5, "HIGH"],
        [5.0, "MEDIUM"],
        [2.0, "LOW"],
    ] as const)("CVSS 2.0 without baseSeverity uses baseScore bands (%s → %s)", (score, expected) => {
        const cve = minimalCve({
            id: CVE,
            metrics: {
                cvssMetricV2: [
                    {
                        source: "nvd",
                        type: "Primary",
                        cvssData: {
                            version: "2.0",
                            vectorString: "AV:N/AC:L/Au:N/C:C/I:C/A:C",
                            baseScore: score,
                        },
                    },
                ],
            },
        });
        expect(severityFromNvdCveItem(cve)).toBe(expected);
    });

    test("CVSS 3.x NONE baseSeverity maps to UNKNOWN", () => {
        const cve = minimalCve({
            id: CVE,
            metrics: {
                cvssMetricV31: [
                    {
                        source: "nvd",
                        type: "Primary",
                        cvssData: {
                            version: "3.1",
                            vectorString: "CVSS:3.1/AV:N/AC:H/PR:H/UI:R/S:U/C:N/I:N/A:N",
                            baseScore: 0.0,
                            baseSeverity: "NONE",
                        },
                    },
                ],
            },
        });
        expect(severityFromNvdCveItem(cve)).toBe("UNKNOWN");
    });

    test("no usable Primary metrics → UNKNOWN and null primaryCvss", () => {
        const cve = minimalCve({ id: CVE, metrics: {} });
        const r = pickPrimaryCvssAndSeverity(cve);
        expect(r.severity).toBe("UNKNOWN");
        expect(r.primaryCvss).toBeNull();
    });

    test("first Primary among multiple CVSS 3.1 Primary entries", () => {
        const cve = minimalCve({
            id: CVE,
            metrics: {
                cvssMetricV31: [
                    {
                        source: "nvd",
                        type: "Primary",
                        cvssData: {
                            version: "3.1",
                            vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                            baseScore: 9.0,
                            baseSeverity: "CRITICAL",
                        },
                    },
                    {
                        source: "nvd",
                        type: "Primary",
                        cvssData: {
                            version: "3.1",
                            vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
                            baseScore: 0.0,
                            baseSeverity: "LOW",
                        },
                    },
                ],
            },
        });
        expect(severityFromNvdCveItem(cve)).toBe("CRITICAL");
    });

    test("description prefers English over non-English", () => {
        const cve = minimalCve({
            id: CVE,
            descriptions: [
                { lang: "fr", value: "Bonjour" },
                { lang: "en", value: "Hello" },
            ],
        });
        const merged = mergeIntelHighlights(
            oldEntry("UNKNOWN", emptyHighlights),
            CVE,
            nvdEnvelope(cve),
            null,
            null,
        );
        expect(merged.highlights.nvd?.description).toBe("Hello");
    });
});

describe("projectNvdHighlight cpeMatches", () => {
    test("collects NVD cpeMatch rows from fixture CVE-2010-3333", () => {
        const raw = JSON.parse(
            readFileSync(join("__testResources__", "api_responses", "nvd_api", "CVE-2010-3333.json"), "utf-8"),
        );
        const envelope = NvdCves20ResponseSchema.parse(raw);
        const cve = findMatchingNvdCveItem(envelope.vulnerabilities, "CVE-2010-3333");
        expect(cve).not.toBeNull();
        const highlight = projectNvdHighlight(cve!);
        expect(highlight.cpeMatches).toHaveLength(8);
        expect(highlight.cpeMatches[0]?.criteria.startsWith("cpe:2.3:")).toBe(true);
        expect(highlight.cpeMatches[0]?.vulnerable).toBe(true);
        expect(highlight.cweIds).toEqual(["CWE-787"]);
    });

    test("returns empty cpeMatches when configurations are absent", () => {
        const cve = minimalCve({ id: CVE });
        const highlight = projectNvdHighlight(cve);
        expect(highlight.cpeMatches).toEqual([]);
        expect(highlight.cweIds).toEqual([]);
    });

    test("extractCweIdsFromNvd dedupes and preserves order", () => {
        const cve = minimalCve({
            id: CVE,
            weaknesses: [
                {
                    source: "nvd@nist.gov",
                    type: "Primary",
                    description: [{ lang: "en", value: "CWE-502: first" }],
                },
                {
                    source: "other",
                    type: "Secondary",
                    description: [{ lang: "en", value: "CWE-502 duplicate" }],
                },
                {
                    source: "other",
                    type: "Secondary",
                    description: [{ lang: "en", value: "CWE-20" }],
                },
            ],
        });
        expect(extractCweIdsFromNvd(cve)).toEqual(["CWE-502", "CWE-20"]);
        expect(projectNvdHighlight(cve).cweIds).toEqual(["CWE-502", "CWE-20"]);
    });

    test("walks nested configuration nodes", () => {
        const cpeInner = {
            vulnerable: true,
            criteria: "cpe:2.3:a:test:inner:1.0:*:*:*:*:*:*:*",
            matchCriteriaId: "A332D04D-CC8C-4F68-A261-BA2F2D8EAD1E",
        };
        const cpeLeaf = {
            vulnerable: true,
            criteria: "cpe:2.3:a:test:leaf:1.0:*:*:*:*:*:*:*",
            matchCriteriaId: "0B191155-67F2-4C6E-BD0C-AF5AF6F04BA1",
        };
        const cve = minimalCve({
            id: CVE,
            configurations: [
                {
                    operator: "AND",
                    nodes: [
                        {
                            operator: "OR",
                            negate: false,
                            nodes: [{ operator: "OR", negate: false, cpeMatch: [cpeInner] }],
                        },
                        { operator: "OR", negate: false, cpeMatch: [cpeLeaf] },
                    ],
                },
            ],
        });
        const highlight = projectNvdHighlight(cve);
        expect(highlight.cpeMatches.map((m) => m.criteria).sort()).toEqual(
            [cpeInner.criteria, cpeLeaf.criteria].sort(),
        );
    });
});

describe("findMatchingNvdCveItem", () => {
    test("returns null when CVE id does not match any vulnerability", () => {
        const env = nvdEnvelope(minimalCve({ id: "CVE-1999-0001" }));
        expect(findMatchingNvdCveItem(env.vulnerabilities, CVE)).toBeNull();
    });

    test("strict equality on cve.id", () => {
        const env = nvdEnvelope(minimalCve({ id: CVE }));
        expect(findMatchingNvdCveItem(env.vulnerabilities, CVE)?.id).toBe(CVE);
    });
});

describe("mergeIntelHighlights", () => {
    const priorNvd = minimalCve({
        id: CVE,
        metrics: {
            cvssMetricV31: [
                {
                    source: "nvd",
                    type: "Primary",
                    cvssData: {
                        version: "3.1",
                        vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
                        baseScore: 0.0,
                        baseSeverity: "LOW",
                    },
                },
            ],
        },
    });

    test("nvd null: preserves prior nvd projection and severity", () => {
        const start = mergeIntelHighlights(
            oldEntry("UNKNOWN", emptyHighlights),
            CVE,
            nvdEnvelope(priorNvd),
            null,
            null,
        );
        const again = mergeIntelHighlights(
            start,
            CVE,
            null,
            null,
            null,
        );
        expect(again.severity).toBe("LOW");
        expect(again.highlights.nvd?.primaryCvss?.version).toBe("3.1");
    });

    test("nvd present but no matching cve.id: preserves prior nvd and severity", () => {
        const start = mergeIntelHighlights(
            oldEntry("UNKNOWN", emptyHighlights),
            CVE,
            nvdEnvelope(priorNvd),
            null,
            null,
        );
        const other = minimalCve({
            id: "CVE-1999-0001",
            metrics: {
                cvssMetricV31: [
                    {
                        source: "nvd",
                        type: "Primary",
                        cvssData: {
                            version: "3.1",
                            vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                            baseScore: 9.8,
                            baseSeverity: "CRITICAL",
                        },
                    },
                ],
            },
        });
        const merged = mergeIntelHighlights(start, CVE, nvdEnvelope(other), null, null);
        expect(merged.severity).toBe("LOW");
        expect(merged.highlights.nvd?.primaryCvss?.baseSeverity).toBe("LOW");
    });

    test("only EPSS updates: NVD and severity-from-old-NVD unchanged when nvd null", () => {
        const withNvd = mergeIntelHighlights(
            oldEntry("UNKNOWN", emptyHighlights),
            CVE,
            nvdEnvelope(priorNvd),
            null,
            null,
        );
        const epss = epssEnvelope([
            { cve: CVE, epss: 0.42, percentile: 0.9, date: "2024-01-01" },
        ]);
        const merged = mergeIntelHighlights(withNvd, CVE, null, epss, null);
        expect(merged.highlights.epss).toEqual({
            cve: CVE,
            epss: 0.42,
            percentile: 0.9,
            date: "2024-01-01",
        });
        expect(merged.highlights.nvd?.primaryCvss?.baseSeverity).toBe("LOW");
        expect(merged.severity).toBe("LOW");
    });

    test("EPSS with no matching row leaves prior epss", () => {
        const prior = mergeIntelHighlights(
            oldEntry("UNKNOWN", emptyHighlights),
            CVE,
            null,
            epssEnvelope([{ cve: CVE, epss: 0.1, percentile: 0.2 }]),
            null,
        );
        const merged = mergeIntelHighlights(
            prior,
            CVE,
            null,
            epssEnvelope([{ cve: "CVE-1999-0001", epss: 0.99, percentile: 0.99 }]),
            null,
        );
        expect(merged.highlights.epss?.epss).toBe(0.1);
    });

    test("only NVD updates: epss and kev unchanged", () => {
        const kevHighlight = intelKevListedFromCisaEntry(
            CisaKevVulnerabilitySchema.parse({
                cveID: CVE,
                vendorProject: "Apache",
                product: "Log4j",
                vulnerabilityName: "Log4Shell",
                dateAdded: "2021-12-14",
                shortDescription: "JNDI",
                requiredAction: "Apply updates",
                dueDate: "2021-12-24",
            }),
        );
        const start = mergeIntelHighlights(
            oldEntry("UNKNOWN", emptyHighlights),
            CVE,
            null,
            epssEnvelope([{ cve: CVE, epss: 0.5, percentile: 0.5 }]),
            kevHighlight,
        );
        const newNvd = minimalCve({
            id: CVE,
            metrics: {
                cvssMetricV31: [
                    {
                        source: "nvd",
                        type: "Primary",
                        cvssData: {
                            version: "3.1",
                            vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                            baseScore: 9.0,
                            baseSeverity: "CRITICAL",
                        },
                    },
                ],
            },
        });
        const merged = mergeIntelHighlights(start, CVE, nvdEnvelope(newNvd), null, null);
        expect(merged.severity).toBe("CRITICAL");
        expect(merged.highlights.epss?.epss).toBe(0.5);
        expect(merged.highlights.kev).toMatchObject({ listed: true, cveID: CVE });
    });

    test("KEV null preserves prior kev", () => {
        const kevHighlight = intelKevListedFromCisaEntry(
            CisaKevVulnerabilitySchema.parse({
                cveID: CVE,
                vendorProject: "Apache",
                product: "Log4j",
                vulnerabilityName: "Log4Shell",
                dateAdded: "2021-12-14",
                shortDescription: "JNDI",
                requiredAction: "Apply updates",
                dueDate: "2021-12-24",
            }),
        );
        const withKev = mergeIntelHighlights(
            oldEntry("UNKNOWN", emptyHighlights),
            CVE,
            null,
            null,
            kevHighlight,
        );
        const merged = mergeIntelHighlights(withKev, CVE, null, null, null);
        expect(merged.highlights.kev).toMatchObject({ listed: true, cveID: CVE });
    });

    test("KEV { listed: false } replaces kev slice", () => {
        const kevHighlight = intelKevListedFromCisaEntry(
            CisaKevVulnerabilitySchema.parse({
                cveID: CVE,
                vendorProject: "Apache",
                product: "Log4j",
                vulnerabilityName: "Log4Shell",
                dateAdded: "2021-12-14",
                shortDescription: "JNDI",
                requiredAction: "Apply updates",
                dueDate: "2021-12-24",
            }),
        );
        const withKev = mergeIntelHighlights(
            oldEntry("UNKNOWN", emptyHighlights),
            CVE,
            null,
            null,
            kevHighlight,
        );
        const notListed = IntelKevNotListedSchema.parse({ listed: false });
        const merged = mergeIntelHighlights(withKev, CVE, null, null, notListed);
        expect(merged.highlights.kev).toEqual({ listed: false });
    });

    test("KEV: merger applies caller-supplied highlight as-is (caller must wrap correct row)", () => {
        const kevA = intelKevListedFromCisaEntry(
            CisaKevVulnerabilitySchema.parse({
                cveID: CVE,
                vendorProject: "Apache",
                product: "Log4j",
                vulnerabilityName: "Log4Shell",
                dateAdded: "2021-12-14",
                shortDescription: "JNDI",
                requiredAction: "Apply updates",
                dueDate: "2021-12-24",
            }),
        );
        const start = mergeIntelHighlights(
            oldEntry("UNKNOWN", emptyHighlights),
            CVE,
            null,
            null,
            kevA,
        );
        const kevOther = intelKevListedFromCisaEntry(
            CisaKevVulnerabilitySchema.parse({
                cveID: "CVE-1999-0001",
                vendorProject: "Other",
                product: "Other",
                vulnerabilityName: "Other",
                dateAdded: "2020-01-01",
                shortDescription: "x",
                requiredAction: "y",
                dueDate: "2020-02-01",
            }),
        );
        const merged = mergeIntelHighlights(start, CVE, null, null, kevOther);
        expect(merged.highlights.kev?.listed).toBe(true);
        expect(merged.highlights.kev).toMatchObject({ cveID: "CVE-1999-0001" });
    });

    test("merged result validates against IntelHighlightsResultSchema", () => {
        const merged = mergeIntelHighlights(
            oldEntry("UNKNOWN", emptyHighlights),
            CVE,
            nvdEnvelope(priorNvd),
            epssEnvelope([{ cve: CVE, epss: 0.2, percentile: 0.3 }]),
            IntelKevNotListedSchema.parse({ listed: false }),
        );
        expect(() => IntelHighlightsResultSchema.parse(merged)).not.toThrow();
    });

    test("EPSS highlight omits time-series from stored projection", () => {
        const epss = epssEnvelope([
            {
                cve: CVE,
                epss: 0.1,
                percentile: 0.2,
                date: "2024-01-02",
                "time-series": [{ epss: 0.05, percentile: 0.1, date: "2024-01-01" }],
            },
        ]);
        const merged = mergeIntelHighlights(
            oldEntry("UNKNOWN", emptyHighlights),
            CVE,
            null,
            epss,
            null,
        );
        expect(merged.highlights.epss).not.toHaveProperty("time-series");
        expect(merged.highlights.epss?.cve).toBe(CVE);
    });

    test("NVD projection includes cisaOnNvd when CISA fields exist on cve", () => {
        const cve = minimalCve({
            id: CVE,
            cisaExploitAdd: "2021-12-14",
            cisaVulnerabilityName: "Log4Shell",
            metrics: {
                cvssMetricV31: [
                    {
                        source: "nvd",
                        type: "Primary",
                        cvssData: {
                            version: "3.1",
                            vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                            baseScore: 10.0,
                            baseSeverity: "CRITICAL",
                        },
                    },
                ],
            },
        });
        const merged = mergeIntelHighlights(
            oldEntry("UNKNOWN", emptyHighlights),
            CVE,
            nvdEnvelope(cve),
            null,
            null,
        );
        expect(merged.highlights.nvd?.cisaOnNvd).toEqual({
            cisaExploitAdd: "2021-12-14",
            cisaVulnerabilityName: "Log4Shell",
        });
    });
});
