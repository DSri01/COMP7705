import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { listComponentsToolHandler } from '../../src/mcp/tools/components.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { ComponentsService } from '../../src/server/components/components.service.js';
import type { Component } from '../../src/db/entities/components/definition.js';
import type { Project } from '../../src/db/entities/projects/definition.js';

describe('list_components MCP tool', () => {
  const projectId = '550e8400-e29b-41d4-a716-446655440000';
  const listMock = jest.fn<ComponentsService['list']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: {} as PlatformMcpToolContext['projectsService'],
    componentsService: { list: listMock } as unknown as ComponentsService,
    containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
    imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
    cvesService: {} as PlatformMcpToolContext['cvesService'],
    cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
  };

  beforeEach(() => {
    listMock.mockReset();
  });

  it('delegates to ComponentsService.list and returns summary JSON without description', async () => {
    const project = { id: projectId } as Project;
    const rows: Component[] = [
      {
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'api',
        description: 'large markdown body',
        createdAtUnixSeconds: 1n,
        updatedAtUnixSeconds: 2n,
        project,
      } as Component,
    ];
    listMock.mockResolvedValue(rows);

    const result = await listComponentsToolHandler(ctx, { projectId });

    expect(listMock).toHaveBeenCalledWith(projectId);
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual([
      {
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        projectId,
        name: 'api',
        createdAtUnixSeconds: '1',
        updatedAtUnixSeconds: '2',
      },
    ]);
  });

  it('returns empty JSON array when there are no components', async () => {
    listMock.mockResolvedValue([]);

    const result = await listComponentsToolHandler(ctx, { projectId });

    expect(JSON.parse(result.content[0].text)).toEqual([]);
  });

  it('returns isError when project is not found', async () => {
    listMock.mockRejectedValue(new NotFoundException(`Project ${projectId} not found`));

    const result = await listComponentsToolHandler(ctx, { projectId });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});
