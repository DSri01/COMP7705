import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { getImageCveToolHandler } from '../../src/mcp/tools/image_cves.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { ImageCvesService } from '../../src/server/components/image_cves/image_cves.service.js';
import type { ImageCveDetailDto } from '../../src/server/components/image_cves/image_cves.types.js';

describe('get_image_cve MCP tool', () => {
  const projectId = '550e8400-e29b-41d4-a716-446655440000';
  const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const imageCveId = '9eb09953-9dad-11d1-80b4-00c04fd430cb';

  const getByIdMock = jest.fn<ImageCvesService['getById']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: {} as PlatformMcpToolContext['projectsService'],
    componentsService: {} as PlatformMcpToolContext['componentsService'],
    containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
    imageCvesService: { getById: getByIdMock } as unknown as ImageCvesService,
    cvesService: {} as PlatformMcpToolContext['cvesService'],
    cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
  };

  beforeEach(() => {
    getByIdMock.mockReset();
  });

  it('delegates to ImageCvesService.getById and returns ImageCveDetailDto JSON', async () => {
    const detail: ImageCveDetailDto = {
      imageCveId,
      cveId: 'CVE-2024-0001',
      source: 'fromScan',
      severity: 'HIGH',
      intelHighlights: null,
      disableState: { state: 'enabled' },
      decision: {
        status: 'under_investigation',
        additionalData: { type: 'fresh' },
        createdAtUnixSeconds: '1',
      },
      advice: { state: 'unset' },
    };
    getByIdMock.mockResolvedValue(detail);

    const result = await getImageCveToolHandler(ctx, { projectId, componentId, imageCveId });

    expect(getByIdMock).toHaveBeenCalledWith(projectId, componentId, imageCveId);
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual(detail);
  });

  it('returns advice timestamp when advice is set', async () => {
    const detail: ImageCveDetailDto = {
      imageCveId,
      cveId: 'CVE-2024-0001',
      source: 'fromScan',
      severity: 'HIGH',
      intelHighlights: null,
      disableState: { state: 'enabled' },
      decision: {
        status: 'under_investigation',
        additionalData: { type: 'fresh' },
        createdAtUnixSeconds: '1',
      },
      advice: {
        state: 'set',
        content: 'Upgrade base image',
        adviceGeneratedAtUnixSeconds: '1700000000',
      },
    };
    getByIdMock.mockResolvedValue(detail);

    const result = await getImageCveToolHandler(ctx, { projectId, componentId, imageCveId });

    expect(JSON.parse(result.content[0].text).advice).toEqual(detail.advice);
  });

  it('returns isError when association or scope is not found', async () => {
    getByIdMock.mockRejectedValue(new NotFoundException('Image CVE not found'));

    const result = await getImageCveToolHandler(ctx, { projectId, componentId, imageCveId });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});
