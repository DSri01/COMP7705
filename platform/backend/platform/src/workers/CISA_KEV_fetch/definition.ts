import { DataSource } from "typeorm";
import { z } from "zod";
import { type BasePollingResult, BasePollingWorker } from "../base.js";
import { asUnixSecondsBigInt, getCurrentTimeUnixSeconds } from "../../utils/time.js";
import { PinoLogger } from "nestjs-pino";
import { KevCatalogFetch } from "../../db/entities/kev_catalog_fetches/definition.js";
import type { KevCatalogFetchEnvelopeJson } from "../../db/entities/kev_catalog_fetches/definition.js";
import { KevCatalogEntry } from "../../db/entities/kev_catalog_entries/definition.js";
import { CisaKevCatalogSchema } from "../../apiClients/cisa_kev_catalog/schema.js";
import type { CisaKevCatalogFetcher } from "../../apiClients/cisa_kev_catalog/definition.js";

const WORKER_NAME = "CISA_KEV_fetchWorker";

function buildCatalogEnvelope(
    catalog: z.infer<typeof CisaKevCatalogSchema>,
): KevCatalogFetchEnvelopeJson {
    const { vulnerabilities: _v, ...envelope } = catalog;
    return envelope as KevCatalogFetchEnvelopeJson;
}

export class CISA_KEV_fetchWorker extends BasePollingWorker {
    private readonly dataSource: DataSource;
    private readonly fetchRefreshDeltaSeconds: number;
    private readonly catalogClient: CisaKevCatalogFetcher;

    constructor(
        dataSource: DataSource,
        intervalSeconds: number,
        fetchRefreshDeltaSeconds: number,
        logger: PinoLogger,
        catalogClient: CisaKevCatalogFetcher,
    ) {
        super(intervalSeconds, logger, WORKER_NAME);
        this.dataSource = dataSource;
        this.fetchRefreshDeltaSeconds = fetchRefreshDeltaSeconds;
        this.catalogClient = catalogClient;
    }

    process: () => Promise<BasePollingResult> = async () => {
        try {
            // TypeORM `findOne` requires a `where` clause; use `find` + `take` for "latest row".
            const latestRows = await this.dataSource.getRepository(KevCatalogFetch).find({
                order: { fetchedAtUnixSeconds: "DESC" },
                take: 1,
            });
            const latestFetch = latestRows[0] ?? null;
            const now = getCurrentTimeUnixSeconds();
            const delta = BigInt(this.fetchRefreshDeltaSeconds);
            if (latestFetch !== null) {
                const fetchedAt = asUnixSecondsBigInt(latestFetch.fetchedAtUnixSeconds);
                if (now - fetchedAt < delta) {
                    return { success: true };
                }
            }

            const catalogResult = await this.catalogClient.fetch();
            if (!catalogResult.success) {
                return { success: false, error: catalogResult.error };
            }

            const { data: catalog } = catalogResult;
            const { vulnerabilities } = catalog;
            const fetchedAtUnixSeconds = getCurrentTimeUnixSeconds();
            const catalogEnvelope = buildCatalogEnvelope(catalog);

            await this.dataSource.transaction(async (manager) => {
                const fetchRepo = manager.getRepository(KevCatalogFetch);
                const fetchRow = fetchRepo.create({
                    fetchedAtUnixSeconds,
                    catalogVersion: catalog.catalogVersion,
                    dateReleased: catalog.dateReleased,
                    vulnerabilityCount: vulnerabilities.length,
                    title: catalog.title ?? null,
                    catalogEnvelope,
                });
                const savedFetch = await fetchRepo.save(fetchRow);

                const entryRepo = manager.getRepository(KevCatalogEntry);
                const entries = vulnerabilities.map((v) =>
                    entryRepo.create({
                        fetch: savedFetch,
                        cveId: v.cveID,
                        vulnerability: v,
                    }),
                );
                await entryRepo.save(entries);
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error
                        : new Error("Unknown CISA KEV fetch worker error"),
            };
        }
    };
}
