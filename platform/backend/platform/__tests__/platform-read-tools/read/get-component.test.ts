import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    componentToResponsePayload,
    getComponent,
    serializeComponent,
} from '../../../src/platform-read-tools/read/get-component.js';
import type { PlatformReadToolContext } from '../../../src/platform-read-tools/context.js';
import type { ComponentsService } from '../../../src/server/components/components.service.js';
import type { Component } from '../../../src/db/entities/components/definition.js';
import type { Project } from '../../../src/db/entities/projects/definition.js';

describe('platform-read-tools get_component', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const getByIdMock = jest.fn<ComponentsService['getById']>();

    const ctx: PlatformReadToolContext = {
        projectsService: {} as PlatformReadToolContext['projectsService'],
        componentsService: { getById: getByIdMock } as unknown as ComponentsService,
        containerImagesService: {} as PlatformReadToolContext['containerImagesService'],
        imageCvesService: {} as PlatformReadToolContext['imageCvesService'],
        cvesService: {} as PlatformReadToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformReadToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        getByIdMock.mockReset();
    });

    it('getComponent returns entity and serializeComponent matches payload', async () => {
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

        const component = await getComponent(ctx, { projectId, componentId });

        expect(getByIdMock).toHaveBeenCalledWith(projectId, componentId);
        expect(JSON.parse(serializeComponent(component))).toEqual(componentToResponsePayload(row));
    });

    it('getComponent propagates NotFoundException', async () => {
        getByIdMock.mockRejectedValue(new NotFoundException('Component x not found'));

        await expect(getComponent(ctx, { projectId, componentId })).rejects.toThrow(NotFoundException);
    });
});
