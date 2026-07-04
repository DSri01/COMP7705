import type { DataSource } from "typeorm";
import { Cve } from "../db/entities/cves/definition.js";
import { ContainerImage } from "../db/entities/container_images/definition.js";
import { ImageCve } from "../db/entities/image_cve/definition.js";
import type { ContainerScannerAPIClient } from "../apiClients/container_scanner/definition.js";

const CANONICAL_CVE_ID = /^CVE-\d{4}-\d{4,}$/;

export type ContainerRescanDeps = {
  containerScanner: Pick<ContainerScannerAPIClient, "scan">;
};

export type RunContainerRescanForImageResult =
  | { ok: true; imageId: string; scannedCveCount: number }
  | { ok: false; reason: "not_found"; imageId: string }
  | { ok: false; reason: "scan_failed"; imageId: string; error: Error };

function buildFreshUnderInvestigationStatement() {
  return {
    status: "under_investigation" as const,
    context: { type: "fresh" as const },
  };
}

function normalizeAndDedupeCveIds(cveIds: string[]): string[] {
  const deduped = new Set<string>();
  for (const raw of cveIds) {
    const normalized = raw.trim().toUpperCase();
    if (!CANONICAL_CVE_ID.test(normalized)) {
      continue;
    }
    deduped.add(normalized);
  }
  return [...deduped];
}

export async function runContainerRescanForImage(
  dataSource: DataSource,
  deps: ContainerRescanDeps,
  imageId: string,
  getNowUnixSeconds: () => bigint,
): Promise<RunContainerRescanForImageResult> {
  const imageRepo = dataSource.getRepository(ContainerImage);
  const image = await imageRepo.findOne({
    where: { id: imageId },
    relations: { storedFile: true },
  });
  if (!image) {
    return { ok: false, reason: "not_found", imageId };
  }

  image.scanResultCode = "scanning";
  image.scanAttemptedAtUnixSeconds = getNowUnixSeconds();
  await imageRepo.save(image);

  const containerFileName = `${image.storedFile.id}.tar`;
  const scanResult = await deps.containerScanner.scan(containerFileName);

  if (!scanResult.success) {
    image.scanResultCode = "ok";
    image.scanFinishedAtUnixSeconds = getNowUnixSeconds();
    await imageRepo.save(image);
    return {
      ok: false,
      reason: "scan_failed",
      imageId: image.id,
      error: scanResult.error,
    };
  }

  const dedupedCveIds = normalizeAndDedupeCveIds(scanResult.data.vulnerabilityIDs);
  const decisionRecordedAt = getNowUnixSeconds();
  await dataSource.transaction(async (manager) => {
    const txImageRepo = manager.getRepository(ContainerImage);
    const txCveRepo = manager.getRepository(Cve);
    const txImageCveRepo = manager.getRepository(ImageCve);

    const image = await txImageRepo.findOne({
      where: { id: imageId },
      relations: { storedFile: true },
    });
    if (!image) {
      throw new Error(`Container image disappeared before scan apply: ${imageId}`);
    }

    const existingRows = await txImageCveRepo.find({
      where: { containerImage: { id: image.id } },
      relations: { cve: true },
    });
    const existingByCveId = new Map(existingRows.map((row) => [row.cve.cveId, row]));

    for (const cveId of dedupedCveIds) {
      const existing = existingByCveId.get(cveId);
      if (existing) {
        existing.source = "fromScan";
        await txImageCveRepo.save(existing);
        continue;
      }

      let cve = await txCveRepo.findOne({ where: { cveId } });
      if (!cve) {
        cve = txCveRepo.create({
          cveId,
          severity: "UNKNOWN",
          intelHighlights: null,
          intelLastAttemptAtUnixSeconds: 0n,
          intelUpdatedAtUnixSeconds: 0n,
          researchSummary: "",
        });
        await txCveRepo.save(cve);
      }

      const created = txImageCveRepo.create({
        containerImage: image,
        cve,
        source: "fromScan",
        firstIntroducedChainIndex: image.chainIndex,
        originalSource: "fromScan",
        isDisabled: false,
        disabledReason: "",
        advice: null,
        storedInternalStatement: buildFreshUnderInvestigationStatement(),
        expiryTimeUnixSeconds: null,
        decisionRecordedAtUnixSeconds: decisionRecordedAt,
      });
      await txImageCveRepo.save(created);
    }
  });

  image.scanResultCode = "ok";
  image.scanFinishedAtUnixSeconds = getNowUnixSeconds();
  await imageRepo.save(image);

  return {
    ok: true,
    imageId: image.id,
    scannedCveCount: dedupedCveIds.length,
  };
}

