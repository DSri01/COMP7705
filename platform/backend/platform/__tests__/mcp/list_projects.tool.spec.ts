import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { listProjectsToolHandler } from '../../src/mcp/tools/projects.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { ProjectsService } from '../../src/server/projects/projects.service.js';
import type { Project } from '../../src/db/entities/projects/definition.js';

describe('list_projects MCP tool', () => {
  const listMock = jest.fn<ProjectsService['list']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: { list: listMock } as unknown as ProjectsService,
    componentsService: {} as PlatformMcpToolContext['componentsService'],
    containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
    imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
    cvesService: {} as PlatformMcpToolContext['cvesService'],
    cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
  };

  beforeEach(() => {
    listMock.mockReset();
  });

  it('delegates to ProjectsService.list and returns summary JSON without description', async () => {
    const rows: Project[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'proj',
        description: 'deployment context',
        createdAtUnixSeconds: 1n,
        updatedAtUnixSeconds: 2n,
      } as Project,
    ];
    listMock.mockResolvedValue(rows);

    const result = await listProjectsToolHandler(ctx);

    expect(listMock).toHaveBeenCalledTimes(1);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual([
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'proj',
        createdAtUnixSeconds: '1',
        updatedAtUnixSeconds: '2',
      },
    ]);
  });

  it('returns empty JSON array when there are no projects', async () => {
    listMock.mockResolvedValue([]);

    const result = await listProjectsToolHandler(ctx);

    expect(JSON.parse(result.content[0].text)).toEqual([]);
  });
});
