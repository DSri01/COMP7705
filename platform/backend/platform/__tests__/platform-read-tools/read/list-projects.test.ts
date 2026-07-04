import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    listProjects,
    listProjectsJson,
    projectToListSummaryPayload,
    projectsToListSummaryPayload,
} from '../../../src/platform-read-tools/read/list-projects.js';
import type { PlatformReadToolContext } from '../../../src/platform-read-tools/context.js';
import type { ProjectsService } from '../../../src/server/projects/projects.service.js';
import type { Project } from '../../../src/db/entities/projects/definition.js';

describe('platform-read-tools list_projects', () => {
    const listMock = jest.fn<ProjectsService['list']>();

    const ctx: PlatformReadToolContext = {
        projectsService: { list: listMock } as unknown as ProjectsService,
        componentsService: {} as PlatformReadToolContext['componentsService'],
        containerImagesService: {} as PlatformReadToolContext['containerImagesService'],
        imageCvesService: {} as PlatformReadToolContext['imageCvesService'],
        cvesService: {} as PlatformReadToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformReadToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        listMock.mockReset();
    });

    it('projectToListSummaryPayload omits description', () => {
        const row: Project = {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'proj',
            description: 'deployment context',
            createdAtUnixSeconds: 1n,
            updatedAtUnixSeconds: 2n,
        } as Project;

        expect(projectToListSummaryPayload(row)).toEqual({
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'proj',
            createdAtUnixSeconds: '1',
            updatedAtUnixSeconds: '2',
        });
    });

    it('listProjectsJson delegates to ProjectsService.list', async () => {
        const rows: Project[] = [
            {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'proj',
                description: 'hidden',
                createdAtUnixSeconds: 1n,
                updatedAtUnixSeconds: 2n,
            } as Project,
        ];
        listMock.mockResolvedValue(rows);

        const projects = await listProjects(ctx);
        const text = await listProjectsJson(ctx);

        expect(listMock).toHaveBeenCalledTimes(2);
        expect(projects).toBe(rows);
        expect(JSON.parse(text)).toEqual(projectsToListSummaryPayload(rows));
    });
});
