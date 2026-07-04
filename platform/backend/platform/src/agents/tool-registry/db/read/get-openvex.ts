import { NotFoundException } from '@nestjs/common';
import { tool, type StructuredTool } from '@langchain/core/tools';

import { getOpenVex, serializeOpenVex } from '../../../../platform-read-tools/read/get-openvex.js';
import type { PlatformDbToolContext } from '../context.js';
import { ComponentScopeSchema, type ComponentScopeInput } from '../schemas/component-scope.js';

const GetOpenVexInputSchema = ComponentScopeSchema;

export type GetOpenVexInput = ComponentScopeInput;

/** Agent adapter: OpenVEX export as JSON string or `ERROR: …`. */
export async function getOpenVexDbHandler(
    ctx: PlatformDbToolContext,
    args: GetOpenVexInput,
): Promise<string> {
    try {
        const doc = await getOpenVex(ctx, args);
        return serializeOpenVex(doc);
    } catch (e) {
        if (e instanceof NotFoundException) {
            return `ERROR: ${e.message}`;
        }
        throw e;
    }
}

/** LangChain `get_openvex` tool. Tool name: `get_openvex`. */
export function createGetOpenVexTool(
    ctx: PlatformDbToolContext,
): StructuredTool<typeof GetOpenVexInputSchema> {
    return tool(async (args) => getOpenVexDbHandler(ctx, args), {
        name: 'get_openvex',
        description:
            "Export OpenVEX v0.2.0 JSON for the component's latest container image (enabled CVE statements). " +
            'Matches GET /projects/{projectId}/components/{componentId}/vex.',
        schema: GetOpenVexInputSchema,
    });
}
