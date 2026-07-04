import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    componentToAgentResponsePayload,
    createGetComponentTool,
    getComponentDbHandler,
} from '../../../../../src/agents/tool-registry/db/read/get-component.js';
import type { PlatformDbToolContext } from '../../../../../src/agents/tool-registry/db/context.js';
import type { ComponentsService } from '../../../../../src/server/components/components.service.js';
import type { Component } from '../../../../../src/db/entities/components/definition.js';
import type { Project } from '../../../../../src/db/entities/projects/definition.js';

const slice = { startChar: 0, endChar: 200 };

describe('get_component db tool', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const getByIdMock = jest.fn<ComponentsService['getById']>();

    const ctx: PlatformDbToolContext = {
        projectsService: {} as PlatformDbToolContext['projectsService'],
        componentsService: { getById: getByIdMock } as unknown as ComponentsService,
        containerImagesService: {} as PlatformDbToolContext['containerImagesService'],
        imageCvesService: {} as PlatformDbToolContext['imageCvesService'],
        cvesService: {} as PlatformDbToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformDbToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        getByIdMock.mockReset();
    });

    it('getComponentDbHandler delegates to ComponentsService.getById', async () => {
        const project = { id: projectId } as Project;
        const row: Component = {
            id: componentId,
            name: 'api',
            description: 'details',
            createdAtUnixSeconds: 1n,
            updatedAtUnixSeconds: 2n,
            project,
        } as Component;
        getByIdMock.mockResolvedValue(row);

        const text = await getComponentDbHandler(ctx, { projectId, componentId, ...slice });

        expect(getByIdMock).toHaveBeenCalledWith(projectId, componentId);
        expect(JSON.parse(text)).toEqual(componentToAgentResponsePayload(row, slice));
    });

    it('getComponentDbHandler returns ERROR when not found', async () => {
        getByIdMock.mockRejectedValue(new NotFoundException('Component x not found'));

        const text = await getComponentDbHandler(ctx, { projectId, componentId, ...slice });

        expect(text).toMatch(/^ERROR:/);
    });

    it('createGetComponentTool invokes handler via LangChain', async () => {
        getByIdMock.mockResolvedValue({
            id: componentId,
            name: 'api',
            description: 'x',
            createdAtUnixSeconds: 0n,
            updatedAtUnixSeconds: 0n,
            project: { id: projectId } as Project,
        } as Component);

        const tool = createGetComponentTool(ctx);
        const result = await tool.invoke({ projectId, componentId, startChar: 0, endChar: 200 });

        expect(result).toContain('api');
        expect(result).toContain('charLength');
    });
});
