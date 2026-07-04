/// <reference types="node" />
import { describe, expect, test, jest, beforeEach, afterEach } from "@jest/globals";
import { EPSS_APIClient } from "../../src/apiClients/epss/definition.js";
import { EpssApiResponseSchema } from "../../src/apiClients/epss/schema.js";
import { readFileSync } from "fs";
import { join } from "path";

const fixtureCVEs = ["CVE-2010-3333", "CVE-2026-6388"] as const;

const fixtureJsons = fixtureCVEs.map((cveId) =>
    JSON.parse(
        readFileSync(
            join("__testResources__", "api_responses", "epss_api", `${cveId}.json`),
            "utf-8",
        ),
    ),
);

const EPSS_URL = "https://api.first.org/data/v1/epss";

/**
 * These tests do not call the actual EPSS API; `fetch` is mocked with fixture JSON.
 */
describe("EPSS_APIClient", () => {
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

    test("getCVE_EPSSData fetches and parses fixture for CVE-2010-3333", async () => {
        const client = new EPSS_APIClient();
        const response = await client.getCVE_EPSSData("CVE-2010-3333");

        expect(fetch).toHaveBeenCalledWith(`${EPSS_URL}?cve=CVE-2010-3333`, {
            method: "GET",
        });
        expect(response.success).toBe(true);
        if (!response.success) {
            throw new Error(response.error.message);
        }
        expect(response.data).toEqual(EpssApiResponseSchema.parse(fixtureJsons[0]));
    });

    test("schema validation on CVE-2010-3333 fixture", () => {
        const parseResult = EpssApiResponseSchema.safeParse(fixtureJsons[0]);
        expect(parseResult.success).toBe(true);
        if (!parseResult.success) {
            throw new Error(parseResult.error.message);
        }
        const data = parseResult.data;
        expect(data.status).toBe("OK");
        expect(data["status-code"]).toBe(200);
        expect(data.total).toBe(1);
        expect(data.data).toHaveLength(1);
        expect(data.data[0]?.cve).toBe("CVE-2010-3333");
        expect(data.data[0]?.epss).toBeCloseTo(0.9379, 4);
        expect(data.data[0]?.percentile).toBeCloseTo(0.99858, 5);
        expect(data.data[0]?.date).toBe("2026-04-16");
    });

    test.each(fixtureCVEs.map((id, i) => [id, i] as const))(
        "schema parses fixture for %s",
        (cveId, index) => {
            const parseResult = EpssApiResponseSchema.safeParse(fixtureJsons[index]);
            expect(parseResult.success).toBe(true);
            if (!parseResult.success) {
                throw new Error(`${cveId}: ${parseResult.error.message}`);
            }
            expect(parseResult.data.data[0]?.cve).toBe(cveId);
        },
    );

    test("getCVE_EPSSData returns failure when fetch rejects", async () => {
        jest.spyOn(global, "fetch").mockRejectedValue(new Error("network error"));
        const client = new EPSS_APIClient();
        const response = await client.getCVE_EPSSData("CVE-2010-3333");

        expect(response.success).toBe(false);
        if (response.success) {
            throw new Error("expected failure");
        }
        expect(response.error.message).toContain("network error");
    });

    test("getCVE_EPSSData returns failure when response is not ok", async () => {
        jest.spyOn(global, "fetch").mockResolvedValue({
            ok: false,
            statusText: "Service Unavailable",
        } as Response);
        const client = new EPSS_APIClient();
        const response = await client.getCVE_EPSSData("CVE-2026-6388");

        expect(response.success).toBe(false);
        if (response.success) {
            throw new Error("expected failure");
        }
        expect(response.error.message).toContain("CVE-2026-6388");
        expect(response.error.message).toContain("Service Unavailable");
    });

    test("getCVE_EPSSData returns failure when JSON does not match schema", async () => {
        jest.spyOn(global, "fetch").mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ invalid: true }),
        } as Response);
        const client = new EPSS_APIClient();
        const response = await client.getCVE_EPSSData("CVE-2010-3333");

        expect(response.success).toBe(false);
        if (response.success) {
            throw new Error("expected failure");
        }
        expect(response.error.message.length).toBeGreaterThan(0);
    });

    test("EpssApiResponseSchema.safeParse rejects invalid root", () => {
        const r = EpssApiResponseSchema.safeParse({ foo: 1 });
        expect(r.success).toBe(false);
    });
});
