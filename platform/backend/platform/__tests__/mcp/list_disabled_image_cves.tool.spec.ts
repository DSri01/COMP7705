import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { listDisabledImageCvesToolHandler } from '../../src/mcp/tools/image_cves.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { ImageCvesService } from '../../src/server/components/image_cves/image_cves.service.js';
import type { ImageCveListItemDto } from '../../src/server/components/image_cves/image_cves.types.js';

describe('list_disabled_image_cves MCP tool', () => {
  const projectId = '550e8400-e29b-41d4-a716-446655440000';
  const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  const listDisabledMock = jest.fn<ImageCvesService['listDisabled']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: {} as PlatformMcpToolContext['projectsService'],
    componentsService: {} as PlatformMcpToolContext['componentsService'],
    containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
    imageCvesService: { listDisabled: listDisabledMock } as unknown as ImageCvesService,
    cvesService: {} as PlatformMcpToolContext['cvesService'],
    cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
  };

  beforeEach(() => {
    listDisabledMock.mockReset();
  });

  it('delegates to ImageCvesService.listDisabled and returns JSON matching HTTP shape', async () => {
    const item: ImageCveListItemDto = {
      imageCveId: '9eb09953-9dad-11d1-80b4-00c04fd430cb',
      cveId: 'CVE-2024-0001',
      source: 'fromScan',
      severity: 'HIGH',
      intelHighlights: null,
      vexStatus: 'under_investigation',
      vexStateKind: 'under_investigation_fresh',
      expiryTimeUnixSeconds: null,
      disableState: { state: 'disabled', reason: 'noise' },
    };
    listDisabledMock.mockResolvedValue({ imageCves: [item] });

    const result = await listDisabledImageCvesToolHandler(ctx, { projectId, componentId });

    expect(listDisabledMock).toHaveBeenCalledWith(projectId, componentId);
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual({ imageCves: [item] });
  });

  it('returns isError when component or current image is missing', async () => {
    listDisabledMock.mockRejectedValue(new NotFoundException('No container image for component'));

    const result = await listDisabledImageCvesToolHandler(ctx, { projectId, componentId });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('container image');
  });
});
