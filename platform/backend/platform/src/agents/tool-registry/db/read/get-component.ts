import { NotFoundException } from '@nestjs/common';
import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import {
    componentToResponsePayload,
    getComponent,
} from '../../../../platform-read-tools/read/get-component.js';
import type { Component } from '../../../../db/entities/components/definition.js';
import type { PlatformDbToolContext } from '../context.js';
import { ComponentScopeSchema } from '../schemas/component-scope.js';
import { sliceTextContent, TextSliceFieldsSchema, type TextSliceInput } from '../text-slice.js';

const GetComponentInputSchema = ComponentScopeSchema.and(TextSliceFieldsSchema);

export type GetComponentInput = z.infer<typeof GetComponentInputSchema>;

/** Agent response: metadata + description slice with length bounds. */
export function componentToAgentResponsePayload(component: Component, slice: TextSliceInput) {
    const base = componentToResponsePayload(component);
    const sliced = sliceTextContent(component.description ?? '', slice.startChar, slice.endChar);

    return {
        id: base.id,
        projectId: base.projectId,
        name: base.name,
        description: sliced.content,
        charLength: sliced.charLength,
        returnedStartChar: sliced.returnedStartChar,
        returnedEndChar: sliced.returnedEndChar,
        createdAtUnixSeconds: base.createdAtUnixSeconds,
        updatedAtUnixSeconds: base.updatedAtUnixSeconds,
    };
}

/** Agent adapter: component detail with sliced description or `ERROR: …`. */
export async function getComponentDbHandler(
    ctx: PlatformDbToolContext,
    args: GetComponentInput,
): Promise<string> {
    try {
        const component = await getComponent(ctx, args);
        return JSON.stringify(componentToAgentResponsePayload(component, args), null, 2);
    } catch (e) {
        if (e instanceof NotFoundException) {
            return `ERROR: ${e.message}`;
        }
        throw e;
    }
}

/** LangChain `get_component` tool. Tool name: `get_component`. */
export function createGetComponentTool(
    ctx: PlatformDbToolContext,
): StructuredTool<typeof GetComponentInputSchema> {
    return tool(async (args) => getComponentDbHandler(ctx, args), {
        name: 'get_component',
        description:
            'Get one component by project UUID and component UUID: id, projectId, name, ' +
            'createdAtUnixSeconds, updatedAtUnixSeconds (string decimals), and a description slice. ' +
            'Required startChar/endChar (half-open [start,end)); response includes charLength, ' +
            'returnedStartChar, returnedEndChar, and sliced description. ' +
            'When length is unknown, start with startChar=0 and endChar=200.',
        schema: GetComponentInputSchema,
    });
}
