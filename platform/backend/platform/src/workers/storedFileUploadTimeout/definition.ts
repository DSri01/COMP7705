import { DataSource } from "typeorm";
import { LessThanOrEqual } from "typeorm";
import { StoredFile } from "../../db/entities/stored_files/definition.js";
import { type BasePollingResult, BasePollingWorker } from "../base.js";
import { getCurrentTimeUnixSeconds } from "../../utils/time.js";
import { PinoLogger } from "nestjs-pino";

const WORKER_NAME = "StoredFileUploadTimeoutWorker";

export class StoredFileUploadTimeoutWorker extends BasePollingWorker {
    private readonly dataSource: DataSource
    private readonly timeoutSeconds: number;

    constructor(
        dataSource: DataSource,
        intervalSeconds: number,
        timeoutSeconds: number,
        logger: PinoLogger,
    ) {
        super(intervalSeconds, logger, WORKER_NAME);
        this.dataSource = dataSource;
        this.timeoutSeconds = timeoutSeconds;
    }

    process: () => Promise<BasePollingResult> = async () => {
        try {
            await this.dataSource.transaction(async (manager) => {
                const storedFileRepo = manager.getRepository(StoredFile);
                const cutoffUnixSeconds = getCurrentTimeUnixSeconds() - BigInt(this.timeoutSeconds);
                const expiredUploadingFiles = await storedFileRepo.find({
                    where: {
                        status: "uploading",
                        uploadStartedAtUnixSeconds: LessThanOrEqual(cutoffUnixSeconds),
                    },
                });

                for (const storedFile of expiredUploadingFiles) {
                    storedFile.status = "failed";
                    await storedFileRepo.save(storedFile);
                }
            });

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error("Unknown stored file timeout worker error"),
            };
        }
    }

}