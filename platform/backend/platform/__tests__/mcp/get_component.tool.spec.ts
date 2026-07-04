import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { getComponentToolHandler } from '../../src/mcp/tools/components.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { ComponentsService } from '../../src/server/components/components.service.js';
import type { Component } from '../../src/db/entities/components/definition.js';
import type { Project } from '../../src/db/entities/projects/definition.js';

describe('get_component MCP tool', () => {
  const projectId = '550e8400-e29b-41d4-a716-446655440000';
  const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const getByIdMock = jest.fn<ComponentsService['getById']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: {} as PlatformMcpToolContext['projectsService'],
    componentsService: { getById: getByIdMock } as unknown as ComponentsService,
    containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
    imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
    cvesService: {} as PlatformMcpToolContext['cvesService'],
    cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
  };

  beforeEach(() => {
    getByIdMock.mockReset();
  });

  it('delegates to ComponentsService.getById and returns ComponentResponseDto-shaped JSON', async () => {
    const project = { id: projectId } as Project;
    const row: Component = {
      id: componentId,
      name: 'api',
      description: 'full text',
      createdAtUnixSeconds: 1n,
      updatedAtUnixSeconds: 2n,
      project,
    } as Component;
    getByIdMock.mockResolvedValue(row);

    const result = await getComponentToolHandler(ctx, { projectId, componentId });

    expect(getByIdMock).toHaveBeenCalledWith(projectId, componentId);
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual({
      id: componentId,
      projectId,
      name: 'api',
      description: 'full text',
      createdAtUnixSeconds: '1',
      updatedAtUnixSeconds: '2',
    });
  });

  it('returns isError when project or component is not found', async () => {
    getByIdMock.mockRejectedValue(new NotFoundException('Component x not found in project y'));

    const result = await getComponentToolHandler(ctx, { projectId, componentId });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});
