/// <reference types="node" />
import { describe, expect, test, jest, beforeEach, afterEach } from "@jest/globals";
import { NVD_CVE_APIClient } from "../../src/apiClients/nvd_cve/definition.js";
import { NvdCves20ResponseSchema } from "../../src/apiClients/nvd_cve/schema.js";
import { readFileSync } from "fs";
import { join } from "path";

const fixtureCVEs = [
    "CVE-2010-3333",
    "CVE-2015-4852",
    "CVE-2021-26855",
    "CVE-2024-3094",
] as const;

const fixtureJsons = fixtureCVEs.map((cveId) =>
    JSON.parse(
        readFileSync(
            join("__testResources__", "api_responses", "nvd_api", `${cveId}.json`),
            "utf-8",
        ),
    ),
);

const NVD_CVE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

/**
 * These tests do not call the actual NVD API; `fetch` is mocked with fixture JSON.
 */
describe("NVD_CVE_APIClient", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(global, "fetch").mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(fixtureJsons[0]),
        } as Response);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("getCVEData fetches and parses fixture for CVE-2010-3333 (no API key)", async () => {
        const client = new NVD_CVE_APIClient(null);
        const response = await client.getCVEData("CVE-2010-3333");

        expect(fetch).toHaveBeenCalledWith(`${NVD_CVE_URL}?cveId=CVE-2010-3333`, {
            method: "GET",
        });
        expect(response.success).toBe(true);
        if (!response.success) {
            throw new Error(response.error.message);
        }
        expect(response.data).toEqual(NvdCves20ResponseSchema.parse(fixtureJsons[0]));
    });

    test("getCVEData sends apiKey header when configured", async () => {
        const client = new NVD_CVE_APIClient("test-nvd-api-key");
        const response = await client.getCVEData("CVE-2010-3333");

        expect(fetch).toHaveBeenCalledWith(`${NVD_CVE_URL}?cveId=CVE-2010-3333`, {
            method: "GET",
            headers: { apiKey: "test-nvd-api-key" },
        });
        expect(response.success).toBe(true);
    });

    test("schema validation on CVE-2010-3333 fixture", () => {
        const parseResult = NvdCves20ResponseSchema.safeParse(fixtureJsons[0]);
        expect(parseResult.success).toBe(true);
        if (!parseResult.success) {
            throw new Error(parseResult.error.message);
        }
        const data = parseResult.data;
        expect(data.totalResults).toBe(1);
        expect(data.vulnerabilities).toHaveLength(1);
        expect(data.vulnerabilities[0]?.cve.id).toBe("CVE-2010-3333");
        expect(data.vulnerabilities[0]?.cve.descriptions[0]?.lang).toBe("en");
    });

    test.each(fixtureCVEs.map((id, i) => [id, i] as const))(
        "schema parses fixture for %s",
        (cveId, index) => {
            const parseResult = NvdCves20ResponseSchema.safeParse(fixtureJsons[index]);
            expect(parseResult.success).toBe(true);
            if (!parseResult.success) {
                throw new Error(`${cveId}: ${parseResult.error.message}`);
            }
            expect(parseResult.data.vulnerabilities[0]?.cve.id).toBe(cveId);
        },
    );

    test("getCVEData returns failure when fetch rejects", async () => {
        jest.spyOn(global, "fetch").mockRejectedValue(new Error("network error"));
        const client = new NVD_CVE_APIClient(null);
        const response = await client.getCVEData("CVE-2010-3333");

        expect(response.success).toBe(false);
        if (response.success) {
            throw new Error("expected failure");
        }
        expect(response.error.message).toContain("network error");
    });

    test("getCVEData returns failure when response is not ok", async () => {
        jest.spyOn(global, "fetch").mockResolvedValue({
            ok: false,
            statusText: "Too Many Requests",
        } as Response);
        const client = new NVD_CVE_APIClient(null);
        const response = await client.getCVEData("CVE-2024-3094");

        expect(response.success).toBe(false);
        if (response.success) {
            throw new Error("expected failure");
        }
        expect(response.error.message).toContain("CVE-2024-3094");
        expect(response.error.message).toContain("Too Many Requests");
    });

    test("getCVEData returns failure when JSON does not match schema", async () => {
        jest.spyOn(global, "fetch").mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ invalid: true }),
        } as Response);
        const client = new NVD_CVE_APIClient(null);
        const response = await client.getCVEData("CVE-2010-3333");

        expect(response.success).toBe(false);
        if (response.success) {
            throw new Error("expected failure");
        }
        expect(response.error.message.length).toBeGreaterThan(0);
    });

    test("NvdCves20ResponseSchema.safeParse rejects invalid root", () => {
        const r = NvdCves20ResponseSchema.safeParse({ foo: 1 });
        expect(r.success).toBe(false);
    });
});
