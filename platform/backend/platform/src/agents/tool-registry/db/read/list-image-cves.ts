import { NotFoundException } from '@nestjs/common';
import { tool, type StructuredTool } from '@langchain/core/tools';

import {
    listImageCves,
    serializeImageCveListPayload,
} from '../../../../platform-read-tools/read/image-cves.js';
import type { PlatformDbToolContext } from '../context.js';
import { ImageCveListInputSchema, type ImageCveListInput } from '../schemas/image-cve-scope.js';

const ListImageCvesInputSchema = ImageCveListInputSchema;

export type ListImageCvesInput = ImageCveListInput;

/** Agent adapter: image-CVE list as JSON string or `ERROR: …`. */
export async function listImageCvesDbHandler(
    ctx: PlatformDbToolContext,
    args: ListImageCvesInput,
): Promise<string> {
    try {
        const payload = await listImageCves(ctx, args);
        return serializeImageCveListPayload(payload);
    } catch (e) {
        if (e instanceof NotFoundException) {
            return `ERROR: ${e.message}`;
        }
        throw e;
    }
}

/** LangChain `list_image_cves` tool. Tool name: `list_image_cves`. */
export function createListImageCvesTool(
    ctx: PlatformDbToolContext,
): StructuredTool<typeof ListImageCvesInputSchema> {
    return tool(async (args) => listImageCvesDbHandler(ctx, args), {
        name: 'list_image_cves',
        description:
            "List CVE associations for the component's current container image (latest chain entry): returns `{ imageCves }` " +
            'with compact triage fields per row (ids, severity, intel highlights, VEX status, disable state). ' +
            'Includes both enabled and disabled rows on that image. ' +
            'Matches GET /projects/{projectId}/components/{componentId}/image-cves. ' +
            'For full decision/advice on one row, use get_image_cve.',
        schema: ListImageCvesInputSchema,
    });
}
