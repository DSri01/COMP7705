import { DataSource, LessThanOrEqual } from "typeorm";
import { Cve } from "../../db/entities/cves/definition.js";
import { type BasePollingResult, BasePollingWorker } from "../base.js";
import { getCurrentTimeUnixSeconds } from "../../utils/time.js";
import { PinoLogger } from "nestjs-pino";
import type { NvdCveFetcher } from "../../apiClients/nvd_cve/definition.js";
import type { EpssFetcher } from "../../apiClients/epss/definition.js";
import { refreshCveIntel } from "../../cveIntelRefresh/definition.js";

const WORKER_NAME = "CveIntelRefreshWorker";

export class CveIntelRefreshWorker extends BasePollingWorker {
    private readonly dataSource: DataSource;
    private readonly refreshDeltaSeconds: number;
    private readonly nvd: NvdCveFetcher;
    private readonly epss: EpssFetcher;
    private readonly staleRefreshBatchSize: number;

    constructor(
        dataSource: DataSource,
        intervalSeconds: number,
        refreshDeltaSeconds: number,
        logger: PinoLogger,
        nvd: NvdCveFetcher,
        epss: EpssFetcher,
        staleRefreshBatchSize: number,
    ) {
        super(intervalSeconds, logger, WORKER_NAME);
        this.dataSource = dataSource;
        this.refreshDeltaSeconds = refreshDeltaSeconds;
        this.nvd = nvd;
        this.epss = epss;
        this.staleRefreshBatchSize = staleRefreshBatchSize;
    }

    process: () => Promise<BasePollingResult> = async () => {
        try {
            const now = getCurrentTimeUnixSeconds();
            const cutoff = now - BigInt(this.refreshDeltaSeconds);
            const cveRepo = this.dataSource.getRepository(Cve);
            const staleRows = await cveRepo.find({
                where: { intelUpdatedAtUnixSeconds: LessThanOrEqual(cutoff) },
                order: { intelUpdatedAtUnixSeconds: "ASC" },
                take: this.staleRefreshBatchSize,
            });

            if (staleRows.length === 0) {
                return { success: true };
            }

            const deps = { nvd: this.nvd, epss: this.epss };
            for (const row of staleRows) {
                const result = await refreshCveIntel(this.dataSource, deps, row.cveId, getCurrentTimeUnixSeconds);
                if (!result.ok) {
                    continue;
                }
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error("Unknown CVE Intel refresh worker error"),
            };
        }
    };
}
