import { NotFoundException } from '@nestjs/common';
import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import {
    getProject,
    projectToResponsePayload,
} from '../../../../platform-read-tools/read/get-project.js';
import type { PlatformDbToolContext } from '../context.js';
import { ProjectIdSchema } from '../schemas/project-id.js';
import { sliceTextContent, TextSliceFieldsSchema, type TextSliceInput } from '../text-slice.js';
import type { Project } from '../../../../db/entities/projects/definition.js';

const GetProjectInputSchema = TextSliceFieldsSchema.extend({
    projectId: ProjectIdSchema,
});

export type GetProjectInput = z.infer<typeof GetProjectInputSchema>;

/** Agent response: metadata + description slice with length bounds. */
export function projectToAgentResponsePayload(project: Project, slice: TextSliceInput) {
    const base = projectToResponsePayload(project);
    const sliced = sliceTextContent(project.description ?? '', slice.startChar, slice.endChar);

    return {
        id: base.id,
        name: base.name,
        description: sliced.content,
        charLength: sliced.charLength,
        returnedStartChar: sliced.returnedStartChar,
        returnedEndChar: sliced.returnedEndChar,
        createdAtUnixSeconds: base.createdAtUnixSeconds,
        updatedAtUnixSeconds: base.updatedAtUnixSeconds,
    };
}

/** Agent adapter: project detail with sliced description or `ERROR: …`. */
export async function getProjectDbHandler(
    ctx: PlatformDbToolContext,
    args: GetProjectInput,
): Promise<string> {
    try {
        const project = await getProject(ctx, args);
        return JSON.stringify(projectToAgentResponsePayload(project, args), null, 2);
    } catch (e) {
        if (e instanceof NotFoundException) {
            return `ERROR: ${e.message}`;
        }
        throw e;
    }
}

/** LangChain `get_project` tool. Tool name: `get_project`. */
export function createGetProjectTool(
    ctx: PlatformDbToolContext,
): StructuredTool<typeof GetProjectInputSchema> {
    return tool(async (args) => getProjectDbHandler(ctx, args), {
        name: 'get_project',
        description:
            'Get one project by UUID: id, name, createdAtUnixSeconds, updatedAtUnixSeconds (string decimals), ' +
            'and a description slice. Required startChar/endChar (half-open [start,end)); ' +
            'response includes charLength, returnedStartChar, returnedEndChar, and sliced description. ' +
            'When length is unknown, start with startChar=0 and endChar=200, then read further ranges.',
        schema: GetProjectInputSchema,
    });
}
