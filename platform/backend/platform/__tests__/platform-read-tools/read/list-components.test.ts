import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    listComponents,
    serializeComponentsList,
} from '../../../src/platform-read-tools/read/list-components.js';
import type { PlatformReadToolContext } from '../../../src/platform-read-tools/context.js';
import type { ComponentsService } from '../../../src/server/components/components.service.js';
import type { Component } from '../../../src/db/entities/components/definition.js';
import type { Project } from '../../../src/db/entities/projects/definition.js';

describe('platform-read-tools list_components', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const listMock = jest.fn<ComponentsService['list']>();

    const ctx: PlatformReadToolContext = {
        projectsService: {} as PlatformReadToolContext['projectsService'],
        componentsService: { list: listMock } as unknown as ComponentsService,
        containerImagesService: {} as PlatformReadToolContext['containerImagesService'],
        imageCvesService: {} as PlatformReadToolContext['imageCvesService'],
        cvesService: {} as PlatformReadToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformReadToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        listMock.mockReset();
    });

    it('listComponents delegates to ComponentsService.list', async () => {
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

        const components = await listComponents(ctx, { projectId });

        expect(listMock).toHaveBeenCalledWith(projectId);
        expect(serializeComponentsList(components)).toContain('api');
    });

    it('listComponents propagates NotFoundException', async () => {
        listMock.mockRejectedValue(new NotFoundException('Project x not found'));

        await expect(listComponents(ctx, { projectId })).rejects.toThrow(NotFoundException);
    });
});
