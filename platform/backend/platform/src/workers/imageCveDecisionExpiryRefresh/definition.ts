import { In, LessThanOrEqual, type DataSource } from "typeorm";
import { type BasePollingResult, BasePollingWorker } from "../base.js";
import { getCurrentTimeUnixSeconds } from "../../utils/time.js";
import { PinoLogger } from "nestjs-pino";
import { ContainerImage } from "../../db/entities/container_images/definition.js";
import { ImageCve } from "../../db/entities/image_cve/definition.js";
import { refreshImageCveDecisionExpiry } from "../../imageCveDecisionExpiryRefresh/definition.js";

const WORKER_NAME = "ImageCveDecisionExpiryRefreshWorker";

export class ImageCveDecisionExpiryRefreshWorker extends BasePollingWorker {
    private readonly dataSource: DataSource;
    private readonly staleRefreshBatchSize: number;

    constructor(
        dataSource: DataSource,
        intervalSeconds: number,
        logger: PinoLogger,
        staleRefreshBatchSize: number,
    ) {
        super(intervalSeconds, logger, WORKER_NAME);
        this.dataSource = dataSource;
        this.staleRefreshBatchSize = staleRefreshBatchSize;
    }

    process: () => Promise<BasePollingResult> = async () => {
        try {
            const now = getCurrentTimeUnixSeconds();
            const imageRepo = this.dataSource.getRepository(ContainerImage);
            const imageCveRepo = this.dataSource.getRepository(ImageCve);

            const images = await imageRepo.find({
                relations: { component: true },
                order: { chainIndex: "DESC" },
            });

            const latestImageIdsByComponent = new Map<string, string>();
            for (const image of images) {
                const componentId = image.component.id;
                if (!latestImageIdsByComponent.has(componentId)) {
                    latestImageIdsByComponent.set(componentId, image.id);
                }
            }
            const latestImageIds = [...latestImageIdsByComponent.values()];
            if (latestImageIds.length === 0) {
                return { success: true };
            }

            const candidates = await imageCveRepo.find({
                where: {
                    containerImage: { id: In(latestImageIds) },
                    expiryTimeUnixSeconds: LessThanOrEqual(now),
                },
                relations: { containerImage: { component: { project: true } }, cve: true },
                order: { expiryTimeUnixSeconds: "ASC" },
                take: this.staleRefreshBatchSize,
            });

            for (const row of candidates) {
                const statement = row.storedInternalStatement;
                if (statement.status !== "not_affected" && statement.status !== "affected") {
                    continue;
                }
                const projectId = row.containerImage.component.project.id;
                const componentId = row.containerImage.component.id;
                await refreshImageCveDecisionExpiry(
                    this.dataSource,
                    { projectId, componentId, imageCveId: row.id },
                    getCurrentTimeUnixSeconds,
                );
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error
                        : new Error("Unknown image CVE decision expiry refresh worker error"),
            };
        }
    };
}
