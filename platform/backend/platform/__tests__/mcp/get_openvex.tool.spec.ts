import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { getOpenVexToolHandler } from '../../src/mcp/tools/components.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { ComponentsService } from '../../src/server/components/components.service.js';

describe('get_openvex MCP tool', () => {
  const projectId = '550e8400-e29b-41d4-a716-446655440000';
  const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  const exportVexMock = jest.fn<ComponentsService['exportVex']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: {} as PlatformMcpToolContext['projectsService'],
    componentsService: { exportVex: exportVexMock } as unknown as ComponentsService,
    containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
    imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
    cvesService: {} as PlatformMcpToolContext['cvesService'],
    cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
  };

  beforeEach(() => {
    exportVexMock.mockReset();
  });

  it('delegates to ComponentsService.exportVex and returns OpenVEX JSON', async () => {
    const doc = { '@context': 'https://openvex.dev/ns/v0.2.0', statements: [] };
    exportVexMock.mockResolvedValue(doc);

    const result = await getOpenVexToolHandler(ctx, { projectId, componentId });

    expect(exportVexMock).toHaveBeenCalledWith(projectId, componentId);
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual(doc);
  });

  it('returns isError when export cannot proceed', async () => {
    exportVexMock.mockRejectedValue(new NotFoundException('No images found for component'));

    const result = await getOpenVexToolHandler(ctx, { projectId, componentId });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('images');
  });
});
