import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    getProject,
    projectToResponsePayload,
    serializeProject,
} from '../../../src/platform-read-tools/read/get-project.js';
import type { PlatformReadToolContext } from '../../../src/platform-read-tools/context.js';
import type { ProjectsService } from '../../../src/server/projects/projects.service.js';
import type { Project } from '../../../src/db/entities/projects/definition.js';

describe('platform-read-tools get_project', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const getByIdMock = jest.fn<ProjectsService['getById']>();

    const ctx: PlatformReadToolContext = {
        projectsService: { getById: getByIdMock } as unknown as ProjectsService,
        componentsService: {} as PlatformReadToolContext['componentsService'],
        containerImagesService: {} as PlatformReadToolContext['containerImagesService'],
        imageCvesService: {} as PlatformReadToolContext['imageCvesService'],
        cvesService: {} as PlatformReadToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformReadToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        getByIdMock.mockReset();
    });

    it('getProject returns entity and serializeProject matches payload', async () => {
        const row: Project = {
            id: projectId,
            name: 'proj',
            description: 'deployment context',
            createdAtUnixSeconds: 1n,
            updatedAtUnixSeconds: 2n,
        } as Project;
        getByIdMock.mockResolvedValue(row);

        const project = await getProject(ctx, { projectId });

        expect(getByIdMock).toHaveBeenCalledWith(projectId);
        expect(JSON.parse(serializeProject(project))).toEqual(projectToResponsePayload(row));
    });

    it('getProject propagates NotFoundException', async () => {
        getByIdMock.mockRejectedValue(new NotFoundException('Project x not found'));

        await expect(getProject(ctx, { projectId })).rejects.toThrow(NotFoundException);
    });
});
