import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import { listProjectsJson } from '../../../../platform-read-tools/read/list-projects.js';
import type { PlatformDbToolContext } from '../context.js';

const ListProjectsInputSchema = z.object({});

export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;

export {
    projectToListSummaryPayload,
    projectsToListSummaryPayload,
} from '../../../../platform-read-tools/read/list-projects.js';

/** Agent adapter: project list as pretty-printed JSON array string. */
export async function listProjectsDbHandler(ctx: PlatformDbToolContext): Promise<string> {
    return listProjectsJson(ctx);
}

/** LangChain `list_projects` tool. Tool name: `list_projects`. */
export function createListProjectsTool(
    ctx: PlatformDbToolContext,
): StructuredTool<typeof ListProjectsInputSchema> {
    return tool(async () => listProjectsDbHandler(ctx), {
        name: 'list_projects',
        description:
            'List all projects with id, name, and timestamp fields (createdAtUnixSeconds, ' +
            'updatedAtUnixSeconds as string decimals). Description is omitted — use get_project for the full record. ' +
            'Matches GET /projects.',
        schema: ListProjectsInputSchema,
    });
}
