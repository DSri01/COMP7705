/// <reference types="node" />
import { describe, expect, test, jest, beforeEach, afterEach } from "@jest/globals";
import { CISA_KEV_CatalogAPIClient } from "../../src/apiClients/cisa_kev_catalog/definition.js";
import { CisaKevCatalogSchema } from "../../src/apiClients/cisa_kev_catalog/schema.js";
import { readFileSync } from "fs";
import { join } from "path";

const fixtureKevCatalog = JSON.parse(
    readFileSync(
        join("__testResources__", "api_responses", "cisa_kev_catalog_api", "CISA.KEV.20260417_10-19.json"),
        "utf-8",
    ),
);

/**
 * These tests do not call the actual API, but rather use a fixture file.
 * The `fetch` method is mocked to return the fixture data.
 */
describe("CISA_KEV_CatalogAPIClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(global, "fetch").mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(fixtureKevCatalog),
        } as Response);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("should fetch the CISA KEV catalog", async () => {
        const client = new CISA_KEV_CatalogAPIClient();
        const response = await client.fetch();
        expect(fetch).toHaveBeenCalledWith(
            "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
            {
                method: "GET",
            },
        );
        expect(response.success).toBe(true);
        if (!response.success) {
            throw new Error(`Failed to fetch CISA KEV catalog: ${response.error.message}`);
        }
        expect(response.data).toEqual(CisaKevCatalogSchema.parse(fixtureKevCatalog));
    });

    test("schema validation", () => {
        const parseResult = CisaKevCatalogSchema.safeParse(fixtureKevCatalog);
        expect(parseResult.success).toBe(true);
        if (!parseResult.success) {
            throw new Error(`Failed to parse CISA KEV catalog: ${parseResult.error.message}`);
        }
        const data = parseResult.data;
        expect(data.catalogVersion).toBe("2026.04.16");
        expect(data.count).toBe(1569);
        expect(data.vulnerabilities).toHaveLength(1569);
        expect(data.title).toContain("Known Exploited");
        expect(data.vulnerabilities[0]?.cveID).toBe("CVE-2026-34197");
        expect(data.vulnerabilities[0]?.vendorProject).toBe("Apache");
        expect(data.vulnerabilities[0]?.cwes).toEqual(["CWE-20", "CWE-94"]);
    });

    test("fetch failure", async () => {
        jest.spyOn(global, "fetch").mockRejectedValue(new Error("Failed to fetch CISA KEV catalog"));
        const client = new CISA_KEV_CatalogAPIClient();
        const response = await client.fetch();
        expect(fetch).toHaveBeenCalledWith(
            "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
            {
                method: "GET",
            },
        );
        expect(response.success).toBe(false);
        if (response.success) {
            throw new Error(`Expected fetch failure, but got success: ${response.data}`);
        }
        expect(response.error.message).toContain("Failed to fetch CISA KEV catalog");
    });

    test("schema parses minimal inline catalog", () => {
        const minimal = {
            catalogVersion: "1.0",
            dateReleased: "2020-01-01T00:00:00.000Z",
            count: 1,
            vulnerabilities: [
                {
                    cveID: "CVE-2021-44228",
                    vendorProject: "Apache",
                    product: "Log4j",
                    vulnerabilityName: "Log4Shell",
                    dateAdded: "2021-12-14",
                    shortDescription: "JNDI injection in Log4j 2.",
                    requiredAction: "Apply updates per vendor instructions.",
                    dueDate: "2021-12-24",
                },
            ],
        };
        const parsed = CisaKevCatalogSchema.safeParse(minimal);
        expect(parsed.success).toBe(true);
        if (!parsed.success) {
            throw new Error(`Failed to parse minimal inline catalog: ${parsed.error.message}`);
        }
        const data = parsed.data;
        expect(data.vulnerabilities[0]?.cveID).toBe("CVE-2021-44228");
        expect(data.vulnerabilities[0]?.vendorProject).toBe("Apache");
        expect(data.vulnerabilities[0]?.product).toBe("Log4j");
        expect(data.vulnerabilities[0]?.vulnerabilityName).toBe("Log4Shell");
        expect(data.vulnerabilities[0]?.dateAdded).toBe("2021-12-14");
        expect(data.vulnerabilities[0]?.shortDescription).toBe("JNDI injection in Log4j 2.");
        expect(data.vulnerabilities[0]?.requiredAction).toBe("Apply updates per vendor instructions.");
        expect(data.vulnerabilities[0]?.dueDate).toBe("2021-12-24");
    });

    test("schema safeParse rejects invalid catalog", () => {
        const r = CisaKevCatalogSchema.safeParse({ foo: 1 });
        expect(r.success).toBe(false);
    });
});