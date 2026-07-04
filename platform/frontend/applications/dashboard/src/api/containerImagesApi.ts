import { z } from "zod";
import { ApiError, ContainerImagesService } from "./generated";

const fileStatusSchema = z.enum(["awaiting_upload", "uploading", "ready", "failed"]);
const scanResultCodeSchema = z.enum(["ok", "container_not_uploaded", "scanning"]);

function normalizeExtension(value: unknown): string | null {
  if (value == null || value === undefined) return null;
  if (typeof value === "string") return value;
  return null;
}

export const containerImageResponseSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  storedFileId: z.string(),
  chainIndex: z.number(),
  fileStatus: fileStatusSchema,
  fileExtension: z
    .unknown()
    .optional()
    .transform((v) => normalizeExtension(v)),
  fileSizeBytes: z.union([z.string(), z.null()]).optional().transform((v) => v ?? null),
  fileUploadStartedAtUnixSeconds: z.union([z.string(), z.null()]).optional().transform((v) => v ?? null),
  createdAtUnixSeconds: z.string(),
  uploadFinishedAtUnixSeconds: z.union([z.string(), z.null()]).optional().transform((v) => v ?? null),
  scanResultCode: scanResultCodeSchema,
  scanAttemptedAtUnixSeconds: z.string(),
  scanFinishedAtUnixSeconds: z.string(),
});

export type ValidatedContainerImage = z.infer<typeof containerImageResponseSchema>;

export function parseContainerImageResponse(raw: unknown): ValidatedContainerImage {
  return containerImageResponseSchema.parse(raw);
}

/** Returns `false` if the file is not an acceptable `.tar` upload (by name). */
export function isTarFileName(file: File): boolean {
  return file.name.toLowerCase().endsWith(".tar");
}

export async function listContainerImages(
  projectId: string,
  componentId: string,
): Promise<ValidatedContainerImage[]> {
  const raw = await ContainerImagesService.containerImagesControllerList(projectId, componentId);
  if (!Array.isArray(raw)) {
    throw new Error("Invalid API response: expected an array of container images");
  }
  return raw.map((item) => parseContainerImageResponse(item));
}

export async function getContainerImageById(
  projectId: string,
  componentId: string,
  imageId: string,
): Promise<ValidatedContainerImage> {
  const raw = await ContainerImagesService.containerImagesControllerGetById(projectId, componentId, imageId);
  return parseContainerImageResponse(raw);
}

/** `null` when the component has no images (HTTP 404 from current endpoint). */
export async function getCurrentContainerImageOrNull(
  projectId: string,
  componentId: string,
): Promise<ValidatedContainerImage | null> {
  try {
    const raw = await ContainerImagesService.containerImagesControllerGetCurrent(projectId, componentId);
    return parseContainerImageResponse(raw);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return null;
    }
    throw e;
  }
}

export async function createContainerImagePlaceholder(
  projectId: string,
  componentId: string,
): Promise<ValidatedContainerImage> {
  const raw = await ContainerImagesService.containerImagesControllerCreate(projectId, componentId);
  return parseContainerImageResponse(raw);
}

export async function uploadContainerImageTar(
  projectId: string,
  componentId: string,
  imageId: string,
  file: File,
): Promise<ValidatedContainerImage> {
  if (!isTarFileName(file)) {
    throw new Error("Only .tar archives are supported.");
  }
  const raw = await ContainerImagesService.containerImagesControllerUpload(projectId, componentId, imageId, {
    file,
  });
  return parseContainerImageResponse(raw);
}
