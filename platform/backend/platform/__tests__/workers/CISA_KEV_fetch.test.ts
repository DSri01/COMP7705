import { test, expect, describe, beforeEach, afterEach, jest } from "@jest/globals";
import type { DataSource } from "typeorm";
import { CISA_KEV_fetchWorker } from "../../src/workers/CISA_KEV_fetch/definition.js";
import { KevCatalogFetch } from "../../src/db/entities/kev_catalog_fetches/definition.js";
import { KevCatalogEntry } from "../../src/db/entities/kev_catalog_entries/definition.js";
import type { PinoLogger } from "nestjs-pino";
import type { CisaKevCatalogFetchResult } from "../../src/apiClients/cisa_kev_catalog/definition.js";

function minimalCatalog(): Extract<CisaKevCatalogFetchResult, { success: true }>["data"] {
    return {
        catalogVersion: "2026.01.01",
        dateReleased: "2026-01-01T12:00:00.000Z",
        count: 2,
        title: "Test KEV",
        vulnerabilities: [
            {
                cveID: "CVE-2021-44228",
                vendorProject: "Apache",
                product: "Log4j",
                vulnerabilityName: "Log4Shell",
                dateAdded: "2021-12-10",
                shortDescription: "JNDI",
                requiredAction: "Update",
                dueDate: "2022-01-01",
            },
            {
                cveID: "CVE-2020-11022",
                vendorProject: "jQuery",
                product: "jQuery",
                vulnerabilityName: "XSS",
                dateAdded: "2020-01-01",
                shortDescription: "XSS",
                requiredAction: "Update",
                dueDate: "2020-06-01",
            },
        ],
    };
}

describe("CISA_KEV_fetchWorker", () => {
    const findMock = jest.fn<() => Promise<KevCatalogFetch[]>>();
    const outerFetchRepo = {
        find: findMock,
    };

    const fetchCreateMock = jest.fn<(partial: object) => object>();
    const fetchSaveMock = jest.fn<(entity: object) => Promise<KevCatalogFetch & { id: string }>>();
    const entryCreateMock = jest.fn<(partial: object) => object>();
    const entrySaveMock = jest.fn<(entities: object[]) => Promise<object[]>>();

    const innerFetchRepo = {
        create: fetchCreateMock,
        save: fetchSaveMock,
    };
    const innerEntryRepo = {
        create: entryCreateMock,
        save: entrySaveMock,
    };

    const managerGetRepositoryMock = jest.fn<(entity: unknown) => typeof innerFetchRepo | typeof innerEntryRepo>();
    const managerMock = {
        getRepository: managerGetRepositoryMock,
    };

    const dataSourceGetRepositoryMock = jest.fn<(entity: unknown) => typeof outerFetchRepo>();
    const transactionMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();

    const dataSourceMock = {
        getRepository: dataSourceGetRepositoryMock,
        transaction: transactionMock,
    };

    const catalogFetchMock = jest.fn<() => Promise<CisaKevCatalogFetchResult>>();

    const loggerMock: Pick<PinoLogger, "info" | "error"> = {
        info: jest.fn(),
        error: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        dataSourceGetRepositoryMock.mockImplementation((entity) => {
            if (entity === KevCatalogFetch) {
                return outerFetchRepo;
            }
            throw new Error(`unexpected getRepository entity: ${String(entity)}`);
        });
        managerGetRepositoryMock.mockImplementation((entity) => {
            if (entity === KevCatalogFetch) {
                return innerFetchRepo;
            }
            if (entity === KevCatalogEntry) {
                return innerEntryRepo;
            }
            throw new Error(`unexpected manager.getRepository entity: ${String(entity)}`);
        });
        transactionMock.mockImplementation(async (...args: unknown[]) => {
            const callback = args[0] as (manager: typeof managerMock) => Promise<void>;
            await callback(managerMock);
        });
        fetchCreateMock.mockImplementation((partial) => ({ ...partial }));
        fetchSaveMock.mockImplementation(async (row) =>
            Object.assign(row, { id: "00000000-0000-4000-8000-000000000001" }) as KevCatalogFetch & {
                id: string;
            },
        );
        entryCreateMock.mockImplementation((partial) => partial);
        entrySaveMock.mockImplementation(async (rows) => rows);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test("process() skips catalog fetch when latest snapshot is newer than refresh delta", async () => {
        const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
        findMock.mockResolvedValue([
            {
                id: "prior-fetch",
                fetchedAtUnixSeconds: nowSeconds - 100n,
                catalogVersion: "old",
                dateReleased: "2020-01-01",
                vulnerabilityCount: 1,
                title: null,
                catalogEnvelope: { catalogVersion: "old", dateReleased: "2020-01-01", count: 1 },
            } as KevCatalogFetch,
        ]);

        const worker = new CISA_KEV_fetchWorker(
            dataSourceMock as unknown as DataSource,
            60,
            3600,
            loggerMock as PinoLogger,
            { fetch: catalogFetchMock },
        );

        const result = await worker.process();

        expect(result.success).toBe(true);
        expect(catalogFetchMock).not.toHaveBeenCalled();
        expect(transactionMock).not.toHaveBeenCalled();
        expect(findMock).toHaveBeenCalledTimes(1);
    });

    test("process() fetches and persists catalog when no prior fetch exists", async () => {
        findMock.mockResolvedValue([]);
        const catalog = minimalCatalog();
        catalogFetchMock.mockResolvedValue({ success: true, data: catalog });

        const worker = new CISA_KEV_fetchWorker(
            dataSourceMock as unknown as DataSource,
            60,
            3600,
            loggerMock as PinoLogger,
            { fetch: catalogFetchMock },
        );

        const result = await worker.process();

        expect(result.success).toBe(true);
        expect(catalogFetchMock).toHaveBeenCalledTimes(1);
        expect(transactionMock).toHaveBeenCalledTimes(1);
        expect(fetchCreateMock).toHaveBeenCalledTimes(1);
        expect(fetchSaveMock).toHaveBeenCalledTimes(1);
        const createArg = fetchCreateMock.mock.calls[0]![0] as {
            catalogVersion: string;
            vulnerabilityCount: number;
            title: string;
        };
        expect(createArg.catalogVersion).toBe("2026.01.01");
        expect(createArg.vulnerabilityCount).toBe(2);
        expect(createArg.title).toBe("Test KEV");
        expect(entryCreateMock).toHaveBeenCalledTimes(2);
        expect(entrySaveMock).toHaveBeenCalledTimes(1);
        const savedEntries = entrySaveMock.mock.calls[0]![0] as { cveId: string }[];
        expect(savedEntries.map((e) => e.cveId)).toEqual(["CVE-2021-44228", "CVE-2020-11022"]);
    });

    test("process() fetches when latest snapshot is older than refresh delta", async () => {
        findMock.mockResolvedValue([
            {
                id: "old",
                fetchedAtUnixSeconds: 1n,
                catalogVersion: "old",
                dateReleased: "2020-01-01",
                vulnerabilityCount: 1,
                title: null,
                catalogEnvelope: { catalogVersion: "old", dateReleased: "2020-01-01", count: 1 },
            } as KevCatalogFetch,
        ]);
        catalogFetchMock.mockResolvedValue({ success: true, data: minimalCatalog() });

        const worker = new CISA_KEV_fetchWorker(
            dataSourceMock as unknown as DataSource,
            60,
            3600,
            loggerMock as PinoLogger,
            { fetch: catalogFetchMock },
        );

        const result = await worker.process();

        expect(result.success).toBe(true);
        expect(catalogFetchMock).toHaveBeenCalledTimes(1);
        expect(transactionMock).toHaveBeenCalledTimes(1);
    });

    test("process() returns error when catalog API fails without opening a transaction", async () => {
        findMock.mockResolvedValue([]);
        catalogFetchMock.mockResolvedValue({
            success: false,
            error: new Error("network down"),
        });

        const worker = new CISA_KEV_fetchWorker(
            dataSourceMock as unknown as DataSource,
            60,
            3600,
            loggerMock as PinoLogger,
            { fetch: catalogFetchMock },
        );

        const result = await worker.process();

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.message).toContain("network down");
        }
        expect(transactionMock).not.toHaveBeenCalled();
    });

    test("process() returns error when transaction fails", async () => {
        findMock.mockResolvedValue([]);
        catalogFetchMock.mockResolvedValue({ success: true, data: minimalCatalog() });
        transactionMock.mockRejectedValueOnce(new Error("deadlock"));

        const worker = new CISA_KEV_fetchWorker(
            dataSourceMock as unknown as DataSource,
            60,
            3600,
            loggerMock as PinoLogger,
            { fetch: catalogFetchMock },
        );

        const result = await worker.process();

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.message).toContain("deadlock");
        }
    });
});
