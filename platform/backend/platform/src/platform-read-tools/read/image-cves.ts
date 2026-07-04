import type { ImageCveDetailDto, ImageCveListItemDto } from '../../server/components/image_cves/image_cves.types.js';
import type { PlatformReadToolContext } from '../context.js';
import type { GetImageCveInput, ImageCveListInput } from '../schemas/image-cve-scope.js';

export type ImageCveListPayload = { imageCves: ImageCveListItemDto[] };

/** Lists CVE associations for the component's current image. */
export async function listImageCves(
    ctx: PlatformReadToolContext,
    args: ImageCveListInput,
): Promise<ImageCveListPayload> {
    return ctx.imageCvesService.list(args.projectId, args.componentId);
}

/** Lists disabled CVE associations for the component's current image. */
export async function listDisabledImageCves(
    ctx: PlatformReadToolContext,
    args: ImageCveListInput,
): Promise<ImageCveListPayload> {
    return ctx.imageCvesService.listDisabled(args.projectId, args.componentId);
}

/** Full image-CVE detail for the current image row. */
export async function getImageCve(
    ctx: PlatformReadToolContext,
    args: GetImageCveInput,
): Promise<ImageCveDetailDto> {
    return ctx.imageCvesService.getById(args.projectId, args.componentId, args.imageCveId);
}

export function serializeImageCveListPayload(payload: ImageCveListPayload): string {
    return JSON.stringify(payload, null, 2);
}

export function serializeImageCveDetail(payload: ImageCveDetailDto): string {
    return JSON.stringify(payload, null, 2);
}
