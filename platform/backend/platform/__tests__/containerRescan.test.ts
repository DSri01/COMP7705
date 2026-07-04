import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import type { DataSource, EntityManager } from "typeorm";
import { Cve } from "../src/db/entities/cves/definition.js";
import { ContainerImage } from "../src/db/entities/container_images/definition.js";
import { ImageCve } from "../src/db/entities/image_cve/definition.js";
import { runContainerRescanForImage } from "../src/containerRescan/definition.js";

type MutableState = {
  images: ContainerImage[];
  cves: Cve[];
  imageCves: ImageCve[];
};

function makeImage(args: {
  id: string;
  componentId: string;
  chainIndex: number;
  storedFileId: string;
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
      id: args.storedFileId,
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

function makeImageCve(args: {
  id: string;
  imageId: string;
  cveId: string;
  source: "fromScan" | "manual" | "fromChain";
}): ImageCve {
  return {
    id: args.id,
    containerImage: { id: args.imageId } as ImageCve["containerImage"],
    cve: { cveId: args.cveId } as ImageCve["cve"],
    source: args.source,
    firstIntroducedChainIndex: 1,
    originalSource: "manual",
    isDisabled: false,
    disabledReason: "",
    advice: null,
    storedInternalStatement: {
      status: "under_investigation",
      context: { type: "fresh" },
    },
    expiryTimeUnixSeconds: null,
    decisionRecordedAtUnixSeconds: 0n,
  } as ImageCve;
}

function buildMockDataSource(state: MutableState) {
  const imageRepo = {
    find: jest.fn(async () => state.images),
    findOne: jest.fn(async ({ where }: { where: { id: string } }) => {
      return state.images.find((x) => x.id === where.id) ?? null;
    }),
    save: jest.fn(async (image: ContainerImage) => {
      const idx = state.images.findIndex((x) => x.id === image.id);
      if (idx >= 0) {
        state.images[idx] = image;
      } else {
        state.images.push(image);
      }
      return image;
    }),
  };

  const txImageRepo = {
    findOne: jest.fn(async ({ where }: { where: { id: string } }) => {
      return state.images.find((x) => x.id === where.id) ?? null;
    }),
  };

  const txCveRepo = {
    findOne: jest.fn(async ({ where }: { where: { cveId: string } }) => {
      return state.cves.find((x) => x.cveId === where.cveId) ?? null;
    }),
    create: jest.fn((partial: Partial<Cve>) => partial as Cve),
    save: jest.fn(async (row: Cve) => {
      const idx = state.cves.findIndex((x) => x.cveId === row.cveId);
      if (idx >= 0) {
        state.cves[idx] = row;
      } else {
        state.cves.push(row);
      }
      return row;
    }),
  };

  const txImageCveRepo = {
    find: jest.fn(async ({ where }: { where: { containerImage: { id: string } } }) => {
      return state.imageCves.filter((x) => x.containerImage.id === where.containerImage.id);
    }),
    create: jest.fn((partial: Partial<ImageCve>) => partial as ImageCve),
    save: jest.fn(async (row: ImageCve) => {
      const idx = state.imageCves.findIndex(
        (x) => x.containerImage.id === row.containerImage.id && x.cve.cveId === row.cve.cveId,
      );
      if (idx >= 0) {
        state.imageCves[idx] = row;
      } else {
        const withId = { ...row, id: row.id ?? `icve-${state.imageCves.length + 1}` } as ImageCve;
        state.imageCves.push(withId);
        return withId;
      }
      return row;
    }),
  };

  const dataSource = {
    getRepository: (entity: unknown) => {
      if (entity === ContainerImage) {
        return imageRepo;
      }
      throw new Error(`unexpected dataSource.getRepository: ${String(entity)}`);
    },
    transaction: async (cb: (manager: EntityManager) => Promise<void>) => {
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === ContainerImage) {
            return txImageRepo;
          }
          if (entity === Cve) {
            return txCveRepo;
          }
          if (entity === ImageCve) {
            return txImageCveRepo;
          }
          throw new Error(`unexpected transaction.getRepository: ${String(entity)}`);
        },
      };
      await cb(manager as unknown as EntityManager);
    },
  };

  return {
    dataSource: dataSource as unknown as DataSource,
    imageRepo,
    txCveRepo,
    txImageCveRepo,
  };
}

describe("runOldestContainerRescan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns not_found when target image does not exist", async () => {
    const state: MutableState = {
      images: [],
      cves: [],
      imageCves: [],
    };
    const { dataSource, imageRepo } = buildMockDataSource(state);
    const scan = jest.fn(async () => ({ success: true as const, data: { vulnerabilityIDs: [] } }));

    const result = await runContainerRescanForImage(
      dataSource,
      { containerScanner: { scan } },
      "missing-image-id",
      () => 1000n,
    );

    expect(result).toEqual({ ok: false, reason: "not_found", imageId: "missing-image-id" });
    expect(scan).not.toHaveBeenCalled();
    expect(imageRepo.save).not.toHaveBeenCalled();
  });

  test("reconciles scan results for the specified image", async () => {
    const state: MutableState = {
      images: [
        makeImage({
          id: "img-target",
          componentId: "comp-a",
          chainIndex: 2,
          storedFileId: "sf-target",
          attempted: 0n,
          finished: 0n,
        }),
      ],
      cves: [
        {
          cveId: "CVE-2024-1111",
          severity: "UNKNOWN",
          intelHighlights: null,
          intelLastAttemptAtUnixSeconds: 0n,
          intelUpdatedAtUnixSeconds: 0n,
          researchSummary: "",
        } as Cve,
      ],
      imageCves: [
        makeImageCve({
          id: "icve-existing",
          imageId: "img-target",
          cveId: "CVE-2024-1111",
          source: "manual",
        }),
      ],
    };
    const { dataSource, imageRepo, txCveRepo } = buildMockDataSource(state);
    const scan = jest.fn(async (containerFileName: string) => {
      expect(containerFileName).toBe("sf-target.tar");
      return {
        success: true as const,
        data: {
          vulnerabilityIDs: [
            "CVE-2024-1111",
            "cve-2024-2222",
            "not-a-cve",
            "CVE-2024-2222",
          ],
        },
      };
    });
    let now = 1000n;
    const nowFn = () => {
      now += 1n;
      return now;
    };

    const result = await runContainerRescanForImage(
      dataSource,
      { containerScanner: { scan } },
      "img-target",
      nowFn,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.imageId).toBe("img-target");
      expect(result.scannedCveCount).toBe(2);
    }

    expect(imageRepo.save).toHaveBeenCalledTimes(2); // scanning then finalize
    const scannedImage = state.images.find((x) => x.id === "img-target");
    expect(scannedImage?.scanResultCode).toBe("ok");
    expect(scannedImage?.scanFinishedAtUnixSeconds).toBeGreaterThan(0n);

    const existing = state.imageCves.find((x) => x.cve.cveId === "CVE-2024-1111");
    expect(existing?.source).toBe("fromScan");

    const created = state.imageCves.find((x) => x.cve.cveId === "CVE-2024-2222");
    expect(created).toBeDefined();
    expect(created?.source).toBe("fromScan");
    expect(created?.firstIntroducedChainIndex).toBe(2);
    expect(created?.originalSource).toBe("fromScan");

    expect(txCveRepo.save).toHaveBeenCalledTimes(1);
  });

  test("scanner failure finalizes image state and returns ok=false", async () => {
    const state: MutableState = {
      images: [
        makeImage({
          id: "img-1",
          componentId: "comp-1",
          chainIndex: 1,
          storedFileId: "sf-1",
          attempted: 0n,
          finished: 0n,
        }),
      ],
      cves: [],
      imageCves: [],
    };
    const { dataSource, imageRepo, txImageCveRepo } = buildMockDataSource(state);
    const scan = jest.fn(async () => ({
      success: false as const,
      error: new Error("scanner down"),
    }));
    let now = 200n;
    const nowFn = () => {
      now += 1n;
      return now;
    };

    const result = await runContainerRescanForImage(
      dataSource,
      { containerScanner: { scan } },
      "img-1",
      nowFn,
    );

    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === "scan_failed") {
      expect(result.imageId).toBe("img-1");
      expect(result.error.message).toContain("scanner down");
    }

    const image = state.images[0];
    expect(image?.scanResultCode).toBe("ok");
    expect(image?.scanFinishedAtUnixSeconds).toBeGreaterThan(0n);
    expect(imageRepo.save).toHaveBeenCalledTimes(2); // scanning then finalize after failure
    expect(txImageCveRepo.save).not.toHaveBeenCalled();
  });
});

