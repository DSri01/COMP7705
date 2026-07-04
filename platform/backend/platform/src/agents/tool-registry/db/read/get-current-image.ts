import { NotFoundException } from '@nestjs/common';
import { tool, type StructuredTool } from '@langchain/core/tools';

import {
    getCurrentImage,
    serializeContainerImage,
} from '../../../../platform-read-tools/read/get-current-image.js';
import type { PlatformDbToolContext } from '../context.js';
import { ComponentScopeSchema, type ComponentScopeInput } from '../schemas/component-scope.js';

const GetCurrentImageInputSchema = ComponentScopeSchema;

export type GetCurrentImageInput = ComponentScopeInput;

export { containerImageToResponsePayload } from '../../../../platform-read-tools/read/get-current-image.js';

/** Agent adapter: current image as JSON string or `ERROR: …`. */
export async function getCurrentImageDbHandler(
    ctx: PlatformDbToolContext,
    args: GetCurrentImageInput,
): Promise<string> {
    try {
        const image = await getCurrentImage(ctx, args);
        return serializeContainerImage(image);
    } catch (e) {
        if (e instanceof NotFoundException) {
            return `ERROR: ${e.message}`;
        }
        throw e;
    }
}

/** LangChain `get_current_image` tool. Tool name: `get_current_image`. */
export function createGetCurrentImageTool(
    ctx: PlatformDbToolContext,
): StructuredTool<typeof GetCurrentImageInputSchema> {
    return tool(async (args) => getCurrentImageDbHandler(ctx, args), {
        name: 'get_current_image',
        description:
            'Get the current container image for a component (highest chainIndex): id, componentId, ' +
            'stored file and upload fields, scan timestamps. ' +
            'Matches GET /projects/{projectId}/components/{componentId}/images/current.',
        schema: GetCurrentImageInputSchema,
    });
}
