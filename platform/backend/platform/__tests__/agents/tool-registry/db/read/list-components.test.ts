import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    componentToListSummaryPayload,
    componentsToListSummaryPayload,
    createListComponentsTool,
    listComponentsDbHandler,
} from '../../../../../src/agents/tool-registry/db/read/list-components.js';
import type { PlatformDbToolContext } from '../../../../../src/agents/tool-registry/db/context.js';
import type { ComponentsService } from '../../../../../src/server/components/components.service.js';
import type { Component } from '../../../../../src/db/entities/components/definition.js';
import type { Project } from '../../../../../src/db/entities/projects/definition.js';

describe('list_components db tool', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const listMock = jest.fn<ComponentsService['list']>();

    const ctx: PlatformDbToolContext = {
        projectsService: {} as PlatformDbToolContext['projectsService'],
        componentsService: { list: listMock } as unknown as ComponentsService,
        containerImagesService: {} as PlatformDbToolContext['containerImagesService'],
        imageCvesService: {} as PlatformDbToolContext['imageCvesService'],
        cvesService: {} as PlatformDbToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformDbToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        listMock.mockReset();
    });

    it('componentToListSummaryPayload omits description', () => {
        const project = { id: projectId } as Project;
        const row: Component = {
            id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
            name: 'api',
            description: 'large body',
            createdAtUnixSeconds: 1n,
            updatedAtUnixSeconds: 2n,
            project,
        } as Component;

        expect(componentToListSummaryPayload(row)).toEqual({
            id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
            projectId,
            name: 'api',
            createdAtUnixSeconds: '1',
            updatedAtUnixSeconds: '2',
        });
    });

    it('listComponentsDbHandler delegates to ComponentsService.list', async () => {
        const project = { id: projectId } as Project;
        const rows: Component[] = [
            {
                id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
                name: 'api',
                description: 'hidden',
                createdAtUnixSeconds: 1n,
                updatedAtUnixSeconds: 2n,
                project,
            } as Component,
        ];
        listMock.mockResolvedValue(rows);

        const text = await listComponentsDbHandler(ctx, { projectId });

        expect(listMock).toHaveBeenCalledWith(projectId);
        expect(JSON.parse(text)).toEqual(componentsToListSummaryPayload(rows));
    });

    it('listComponentsDbHandler returns ERROR when project not found', async () => {
        listMock.mockRejectedValue(new NotFoundException('Project x not found'));

        const text = await listComponentsDbHandler(ctx, { projectId });

        expect(text).toMatch(/^ERROR:/);
    });

    it('createListComponentsTool invokes handler via LangChain', async () => {
        listMock.mockResolvedValue([]);

        const tool = createListComponentsTool(ctx);
        const result = await tool.invoke({ projectId });

        expect(result).toBe('[]');
    });
});
