import { NotFoundException } from '@nestjs/common';
import { tool, type StructuredTool } from '@langchain/core/tools';

import {
    listDisabledImageCves,
    serializeImageCveListPayload,
} from '../../../../platform-read-tools/read/image-cves.js';
import type { PlatformDbToolContext } from '../context.js';
import { ImageCveListInputSchema, type ImageCveListInput } from '../schemas/image-cve-scope.js';

const ListDisabledImageCvesInputSchema = ImageCveListInputSchema;

export type ListDisabledImageCvesInput = ImageCveListInput;

/** Agent adapter: disabled image-CVE list as JSON string or `ERROR: …`. */
export async function listDisabledImageCvesDbHandler(
    ctx: PlatformDbToolContext,
    args: ListDisabledImageCvesInput,
): Promise<string> {
    try {
        const payload = await listDisabledImageCves(ctx, args);
        return serializeImageCveListPayload(payload);
    } catch (e) {
        if (e instanceof NotFoundException) {
            return `ERROR: ${e.message}`;
        }
        throw e;
    }
}

/** LangChain `list_disabled_image_cves` tool. Tool name: `list_disabled_image_cves`. */
export function createListDisabledImageCvesTool(
    ctx: PlatformDbToolContext,
): StructuredTool<typeof ListDisabledImageCvesInputSchema> {
    return tool(async (args) => listDisabledImageCvesDbHandler(ctx, args), {
        name: 'list_disabled_image_cves',
        description:
            "List disabled CVE associations only for the component's current container image (latest chain entry): " +
            'same `{ imageCves }` shape as list_image_cves but filtered to disabled rows (disableState.state === disabled). ' +
            'Matches GET /projects/{projectId}/components/{componentId}/image-cves/disabled. ' +
            'For full decision/advice on one row, use get_image_cve.',
        schema: ListDisabledImageCvesInputSchema,
    });
}
