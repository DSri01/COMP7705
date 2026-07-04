import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    createGetProjectTool,
    getProjectDbHandler,
    projectToAgentResponsePayload,
} from '../../../../../src/agents/tool-registry/db/read/get-project.js';
import type { PlatformDbToolContext } from '../../../../../src/agents/tool-registry/db/context.js';
import type { ProjectsService } from '../../../../../src/server/projects/projects.service.js';
import type { Project } from '../../../../../src/db/entities/projects/definition.js';

const slice = { startChar: 0, endChar: 200 };

describe('get_project db tool', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const getByIdMock = jest.fn<ProjectsService['getById']>();

    const ctx: PlatformDbToolContext = {
        projectsService: { getById: getByIdMock } as unknown as ProjectsService,
        componentsService: {} as PlatformDbToolContext['componentsService'],
        containerImagesService: {} as PlatformDbToolContext['containerImagesService'],
        imageCvesService: {} as PlatformDbToolContext['imageCvesService'],
        cvesService: {} as PlatformDbToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformDbToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        getByIdMock.mockReset();
    });

    it('projectToAgentResponsePayload slices description with metadata', () => {
        const row: Project = {
            id: projectId,
            name: 'proj',
            description: 'deployment context',
            createdAtUnixSeconds: 1n,
            updatedAtUnixSeconds: 2n,
        } as Project;

        expect(projectToAgentResponsePayload(row, { startChar: 0, endChar: 10 })).toEqual({
            id: projectId,
            name: 'proj',
            description: 'deployment',
            charLength: 18,
            returnedStartChar: 0,
            returnedEndChar: 10,
            createdAtUnixSeconds: '1',
            updatedAtUnixSeconds: '2',
        });
    });

    it('getProjectDbHandler delegates to ProjectsService.getById', async () => {
        const row: Project = {
            id: projectId,
            name: 'proj',
            description: 'deployment context',
            createdAtUnixSeconds: 1n,
            updatedAtUnixSeconds: 2n,
        } as Project;
        getByIdMock.mockResolvedValue(row);

        const text = await getProjectDbHandler(ctx, { projectId, ...slice });

        expect(getByIdMock).toHaveBeenCalledWith(projectId);
        expect(JSON.parse(text)).toEqual(projectToAgentResponsePayload(row, slice));
    });

    it('getProjectDbHandler returns ERROR prefix when not found', async () => {
        getByIdMock.mockRejectedValue(new NotFoundException('Project x not found'));

        const text = await getProjectDbHandler(ctx, { projectId, ...slice });

        expect(text).toMatch(/^ERROR:/);
    });

    it('createGetProjectTool invokes handler via LangChain', async () => {
        getByIdMock.mockResolvedValue({
            id: projectId,
            name: 'proj',
            description: 'x',
            createdAtUnixSeconds: 0n,
            updatedAtUnixSeconds: 0n,
        } as Project);

        const tool = createGetProjectTool(ctx);
        const result = await tool.invoke({ projectId, startChar: 0, endChar: 200 });

        expect(result).toContain('proj');
        expect(result).toContain('charLength');
    });
});
