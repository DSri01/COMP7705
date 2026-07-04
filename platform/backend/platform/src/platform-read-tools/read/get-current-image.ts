import type { ContainerImage } from '../../db/entities/container_images/definition.js';
import type { PlatformReadToolContext } from '../context.js';
import type { ComponentScopeInput } from '../schemas/component-scope.js';

export type GetCurrentImageInput = ComponentScopeInput;

/** Same mapping as `ContainerImagesController` / MCP `get_current_image`. */
export function containerImageToResponsePayload(image: ContainerImage) {
    return {
        id: image.id,
        componentId: image.component.id,
        storedFileId: image.storedFile.id,
        chainIndex: image.chainIndex,
        fileStatus: image.storedFile.status,
        fileExtension: image.storedFile.extension,
        fileSizeBytes: image.storedFile.sizeBytes,
        fileUploadStartedAtUnixSeconds: image.storedFile.uploadStartedAtUnixSeconds?.toString() ?? null,
        createdAtUnixSeconds: image.createdAtUnixSeconds.toString(),
        uploadFinishedAtUnixSeconds: image.uploadFinishedAtUnixSeconds?.toString() ?? null,
        scanResultCode: image.scanResultCode,
        scanAttemptedAtUnixSeconds: image.scanAttemptedAtUnixSeconds.toString(),
        scanFinishedAtUnixSeconds: image.scanFinishedAtUnixSeconds.toString(),
    };
}

/** Fetches current image; propagates Nest `NotFoundException`. */
export async function getCurrentImage(
    ctx: PlatformReadToolContext,
    args: GetCurrentImageInput,
): Promise<ContainerImage> {
    return ctx.containerImagesService.getCurrent(args.projectId, args.componentId);
}

export function serializeContainerImage(image: ContainerImage): string {
    return JSON.stringify(containerImageToResponsePayload(image), null, 2);
}
