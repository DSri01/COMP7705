import { test, expect, describe, beforeEach, afterEach, jest } from "@jest/globals";
import type { DataSource } from "typeorm";
import type { PinoLogger } from "nestjs-pino";
import { ContainerRescanWorker } from "../../src/workers/containerRescan/definition.js";
import { runContainerRescanForImage } from "../../src/containerRescan/definition.js";
import type { ContainerScannerAPIClient } from "../../src/apiClients/container_scanner/definition.js";
import { ContainerImage } from "../../src/db/entities/container_images/definition.js";

jest.mock("../../src/containerRescan/definition.js", () => ({
  runContainerRescanForImage: jest.fn(),
}));

const runContainerRescanForImageMock = jest.mocked(runContainerRescanForImage);

describe("ContainerRescanWorker", () => {
  const imageFindMock = jest.fn<() => Promise<ContainerImage[]>>();
  const getRepositoryMock = jest.fn<(target: unknown) => unknown>();
  const dataSourceMock = {
    getRepository: getRepositoryMock,
  } as unknown as DataSource;
  const loggerMock: Pick<PinoLogger, "info" | "error"> = {
    info: jest.fn(),
    error: jest.fn(),
  };
  const containerScannerMock: Pick<ContainerScannerAPIClient, "scan"> = {
    scan: jest.fn<ContainerScannerAPIClient["scan"]>(),
  };

  function makeImage(args: {
    id: string;
    componentId: string;
    chainIndex: number;
    status?: "awaiting_upload" | "uploading" | "ready" | "failed";
    extension?: string | null;
    attempted?: bigint;
    finished?: bigint;
  }): ContainerImage {
    return {
      id: args.id,
      component: { id: args.componentId } as ContainerImage["component"],
      chainIndex: args.chainIndex,
      storedFile: {
        id: `sf-${args.id}`,
        status: args.status ?? "ready",
        extension: args.extension ?? "tar",
      } as ContainerImage["storedFile"],
      createdAtUnixSeconds: BigInt(args.chainIndex),
      uploadFinishedAtUnixSeconds: 1n,
      scanResultCode: "ok",
      scanAttemptedAtUnixSeconds: args.attempted ?? 0n,
      scanFinishedAtUnixSeconds: args.finished ?? 0n,
    } as ContainerImage;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    getRepositoryMock.mockImplementation((target: unknown) => {
      if (target === ContainerImage) {
        return { find: imageFindMock };
      }
      throw new Error(`unexpected repository target ${String(target)}`);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("process() returns success and does nothing when no candidate exists", async () => {
    imageFindMock.mockResolvedValue([]);
    runContainerRescanForImageMock.mockResolvedValue({ ok: true, imageId: "img-1", scannedCveCount: 0 });

    const worker = new ContainerRescanWorker(
      dataSourceMock,
      60,
      3600,
      loggerMock as PinoLogger,
      containerScannerMock,
    );
    const result = await worker.process();

    expect(result.success).toBe(true);
    expect(runContainerRescanForImageMock).not.toHaveBeenCalled();
  });

  test("process() selects oldest stale candidate and calls shared service", async () => {
    imageFindMock.mockResolvedValue([
      makeImage({ id: "img-a-2", componentId: "comp-a", chainIndex: 2, attempted: 10n, finished: 10n }),
      makeImage({ id: "img-a-1", componentId: "comp-a", chainIndex: 1, attempted: 1n, finished: 1n }),
      makeImage({ id: "img-b-1", componentId: "comp-b", chainIndex: 1, attempted: 5n, finished: 5n }),
    ]);
    runContainerRescanForImageMock.mockResolvedValue({ ok: true, imageId: "img-b-1", scannedCveCount: 2 });

    const worker = new ContainerRescanWorker(
      dataSourceMock,
      60,
      60,
      loggerMock as PinoLogger,
      containerScannerMock,
    );
    const result = await worker.process();

    expect(result.success).toBe(true);
    expect(runContainerRescanForImageMock).toHaveBeenCalledTimes(1);
    expect(runContainerRescanForImageMock.mock.calls[0]?.[2]).toBe("img-b-1");
  });

  test("process() logs scan failure but returns success", async () => {
    imageFindMock.mockResolvedValue([
      makeImage({ id: "img-1", componentId: "comp-1", chainIndex: 1, attempted: 0n, finished: 0n }),
    ]);
    runContainerRescanForImageMock.mockResolvedValue({
      ok: false,
      reason: "scan_failed",
      imageId: "img-1",
      error: new Error("scanner down"),
    });

    const worker = new ContainerRescanWorker(
      dataSourceMock,
      60,
      3600,
      loggerMock as PinoLogger,
      containerScannerMock,
    );
    const result = await worker.process();

    expect(result.success).toBe(true);
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
  });

  test("process() returns failure when shared service throws", async () => {
    imageFindMock.mockResolvedValue([
      makeImage({ id: "img-1", componentId: "comp-1", chainIndex: 1, attempted: 0n, finished: 0n }),
    ]);
    runContainerRescanForImageMock.mockRejectedValue(new Error("unexpected worker crash"));

    const worker = new ContainerRescanWorker(
      dataSourceMock,
      60,
      3600,
      loggerMock as PinoLogger,
      containerScannerMock,
    );
    const result = await worker.process();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("unexpected worker crash");
    }
  });
});

