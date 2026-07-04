import type { DataSource } from "typeorm";
import { PinoLogger } from "nestjs-pino";
import { type BasePollingResult, BasePollingWorker } from "../base.js";
import type { ContainerScannerAPIClient } from "../../apiClients/container_scanner/definition.js";
import { getCurrentTimeUnixSeconds } from "../../utils/time.js";
import { ContainerImage } from "../../db/entities/container_images/definition.js";
import { runContainerRescanForImage } from "../../containerRescan/definition.js";

const WORKER_NAME = "ContainerRescanWorker";

export class ContainerRescanWorker extends BasePollingWorker {
  private readonly dataSource: DataSource;
  private readonly refreshDeltaSeconds: number;
  private readonly containerScanner: Pick<ContainerScannerAPIClient, "scan">;
  private readonly workerLogger: PinoLogger;

  constructor(
    dataSource: DataSource,
    intervalSeconds: number,
    refreshDeltaSeconds: number,
    logger: PinoLogger,
    containerScanner: Pick<ContainerScannerAPIClient, "scan">,
  ) {
    super(intervalSeconds, logger, WORKER_NAME);
    this.dataSource = dataSource;
    this.refreshDeltaSeconds = refreshDeltaSeconds;
    this.containerScanner = containerScanner;
    this.workerLogger = logger;
  }

  process: () => Promise<BasePollingResult> = async () => {
    try {
      const now = getCurrentTimeUnixSeconds();
      const cutoff = now - BigInt(this.refreshDeltaSeconds);
      const imageRepo = this.dataSource.getRepository(ContainerImage);
      const images = await imageRepo.find({
        relations: { component: true, storedFile: true },
        order: { chainIndex: "DESC" },
      });

      const latestImageByComponent = new Map<string, ContainerImage>();
      for (const image of images) {
        const componentId = image.component.id;
        if (!latestImageByComponent.has(componentId)) {
          latestImageByComponent.set(componentId, image);
        }
      }

      const candidate = [...latestImageByComponent.values()]
        .filter((image) => {
          if (image.storedFile.status !== "ready") {
            return false;
          }
          if ((image.storedFile.extension ?? "").toLowerCase() !== "tar") {
            return false;
          }
          if (image.scanAttemptedAtUnixSeconds > image.scanFinishedAtUnixSeconds) {
            return false;
          }
          return image.scanFinishedAtUnixSeconds <= cutoff;
        })
        .sort((a, b) => {
          if (a.scanAttemptedAtUnixSeconds < b.scanAttemptedAtUnixSeconds) {
            return -1;
          }
          if (a.scanAttemptedAtUnixSeconds > b.scanAttemptedAtUnixSeconds) {
            return 1;
          }
          return a.createdAtUnixSeconds < b.createdAtUnixSeconds ? -1 : 1;
        })[0];

      if (!candidate) {
        return { success: true };
      }

      const result = await runContainerRescanForImage(
        this.dataSource,
        { containerScanner: this.containerScanner },
        candidate.id,
        getCurrentTimeUnixSeconds,
      );
      if (!result.ok && result.reason === "scan_failed") {
        this.workerLogger.error(result.error, `Container rescan failed for image ${result.imageId}`, {
          workerName: WORKER_NAME,
          imageId: result.imageId,
        });
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Unknown container rescan worker error"),
      };
    }
  };
}

