import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    createListProjectsTool,
    listProjectsDbHandler,
    projectToListSummaryPayload,
    projectsToListSummaryPayload,
} from '../../../../../src/agents/tool-registry/db/read/list-projects.js';
import type { PlatformDbToolContext } from '../../../../../src/agents/tool-registry/db/context.js';
import type { ProjectsService } from '../../../../../src/server/projects/projects.service.js';
import type { Project } from '../../../../../src/db/entities/projects/definition.js';

describe('list_projects db tool', () => {
    const listMock = jest.fn<ProjectsService['list']>();

    const ctx: PlatformDbToolContext = {
        projectsService: { list: listMock } as unknown as ProjectsService,
        componentsService: {} as PlatformDbToolContext['componentsService'],
        containerImagesService: {} as PlatformDbToolContext['containerImagesService'],
        imageCvesService: {} as PlatformDbToolContext['imageCvesService'],
        cvesService: {} as PlatformDbToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformDbToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        listMock.mockReset();
    });

    it('projectToListSummaryPayload stringifies bigint timestamps and omits description', () => {
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

    it('projectsToListSummaryPayload maps each project', () => {
        const rows: Project[] = [
            {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'a',
                description: 'x',
                createdAtUnixSeconds: 1n,
                updatedAtUnixSeconds: 2n,
            } as Project,
        ];

        expect(projectsToListSummaryPayload(rows)).toEqual([
            {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'a',
                createdAtUnixSeconds: '1',
                updatedAtUnixSeconds: '2',
            },
        ]);
    });

    it('listProjectsDbHandler delegates to ProjectsService.list', async () => {
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

        const text = await listProjectsDbHandler(ctx);

        expect(listMock).toHaveBeenCalledTimes(1);
        expect(JSON.parse(text)).toEqual(projectsToListSummaryPayload(rows));
    });

    it('listProjectsDbHandler returns empty JSON array when there are no projects', async () => {
        listMock.mockResolvedValue([]);

        const text = await listProjectsDbHandler(ctx);

        expect(JSON.parse(text)).toEqual([]);
    });

    it('createListProjectsTool invokes handler via LangChain', async () => {
        listMock.mockResolvedValue([
            {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'proj',
                description: 'hidden',
                createdAtUnixSeconds: 1n,
                updatedAtUnixSeconds: 2n,
            } as Project,
        ]);

        const tool = createListProjectsTool(ctx);
        const result = await tool.invoke({});

        expect(result).toContain('proj');
    });
});
