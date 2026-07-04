import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { getProjectToolHandler } from '../../src/mcp/tools/projects.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { ProjectsService } from '../../src/server/projects/projects.service.js';
import type { Project } from '../../src/db/entities/projects/definition.js';

describe('get_project MCP tool', () => {
  const getByIdMock = jest.fn<ProjectsService['getById']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: { getById: getByIdMock } as unknown as ProjectsService,
    componentsService: {} as PlatformMcpToolContext['componentsService'],
    containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
    imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
    cvesService: {} as PlatformMcpToolContext['cvesService'],
    cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
  };

  beforeEach(() => {
    getByIdMock.mockReset();
  });

  it('delegates to ProjectsService.getById and returns ProjectResponseDto-shaped JSON', async () => {
    const row: Project = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'proj',
      description: 'deployment context',
      createdAtUnixSeconds: 1n,
      updatedAtUnixSeconds: 2n,
    } as Project;
    getByIdMock.mockResolvedValue(row);

    const result = await getProjectToolHandler(ctx, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(getByIdMock).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'proj',
      description: 'deployment context',
      createdAtUnixSeconds: '1',
      updatedAtUnixSeconds: '2',
    });
  });

  it('returns isError when project is not found', async () => {
    getByIdMock.mockRejectedValue(new NotFoundException('Project x not found'));

    const result = await getProjectToolHandler(ctx, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});
