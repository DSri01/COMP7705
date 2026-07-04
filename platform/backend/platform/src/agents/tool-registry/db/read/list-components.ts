import { NotFoundException } from '@nestjs/common';
import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import {
    listComponents,
    serializeComponentsList,
} from '../../../../platform-read-tools/read/list-components.js';
import type { PlatformDbToolContext } from '../context.js';
import { ProjectIdSchema } from '../schemas/project-id.js';

const ListComponentsInputSchema = z.object({
    projectId: ProjectIdSchema,
});

export type ListComponentsInput = z.infer<typeof ListComponentsInputSchema>;

export {
    componentToListSummaryPayload,
    componentsToListSummaryPayload,
} from '../../../../platform-read-tools/read/list-components.js';

/** Agent adapter: component list as JSON array string or `ERROR: …`. */
export async function listComponentsDbHandler(
    ctx: PlatformDbToolContext,
    args: ListComponentsInput,
): Promise<string> {
    try {
        const components = await listComponents(ctx, args);
        return serializeComponentsList(components);
    } catch (e) {
        if (e instanceof NotFoundException) {
            return `ERROR: ${e.message}`;
        }
        throw e;
    }
}

/** LangChain `list_components` tool. Tool name: `list_components`. */
export function createListComponentsTool(
    ctx: PlatformDbToolContext,
): StructuredTool<typeof ListComponentsInputSchema> {
    return tool(async (args) => listComponentsDbHandler(ctx, args), {
        name: 'list_components',
        description:
            'List components in a project: id, projectId, name, and timestamp fields ' +
            '(createdAtUnixSeconds, updatedAtUnixSeconds as string decimals). Description is omitted — ' +
            'use get_component for the full record. Matches GET /projects/{projectId}/components.',
        schema: ListComponentsInputSchema,
    });
}
