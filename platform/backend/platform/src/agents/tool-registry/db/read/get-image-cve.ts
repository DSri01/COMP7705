import { NotFoundException } from '@nestjs/common';
import { tool, type StructuredTool } from '@langchain/core/tools';

import {
    getImageCve,
    serializeImageCveDetail,
} from '../../../../platform-read-tools/read/image-cves.js';
import type { PlatformDbToolContext } from '../context.js';
import { GetImageCveInputSchema, type GetImageCveInput } from '../schemas/image-cve-scope.js';

export type { GetImageCveInput };

/** Agent adapter: image-CVE detail as JSON string or `ERROR: …`. */
export async function getImageCveDbHandler(
    ctx: PlatformDbToolContext,
    args: GetImageCveInput,
): Promise<string> {
    try {
        const payload = await getImageCve(ctx, args);
        return serializeImageCveDetail(payload);
    } catch (e) {
        if (e instanceof NotFoundException) {
            return `ERROR: ${e.message}`;
        }
        throw e;
    }
}

/** LangChain `get_image_cve` tool. Tool name: `get_image_cve`. */
export function createGetImageCveTool(
    ctx: PlatformDbToolContext,
): StructuredTool<typeof GetImageCveInputSchema> {
    return tool(async (args) => getImageCveDbHandler(ctx, args), {
        name: 'get_image_cve',
        description:
            "Get one image-CVE association for the component's current container image: full detail including `decision` " +
            'and `advice` (`ImageCveDetail`), matching GET /projects/{projectId}/components/{componentId}/image-cves/{imageCveId}. ' +
            'Use list_image_cves / list_disabled_image_cves for compact rows and imageCveId.',
        schema: GetImageCveInputSchema,
    });
}
