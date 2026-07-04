import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { getComponentImageCveStatsToolHandler } from '../../src/mcp/tools/components.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { ComponentsService } from '../../src/server/components/components.service.js';
import type { ImageCveStats } from '../../src/server/components/image_cves/image_cve_stats.js';

describe('get_component_image_cve_stats MCP tool', () => {
  const projectId = '550e8400-e29b-41d4-a716-446655440000';
  const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  const getStatsMock = jest.fn<ComponentsService['getStats']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: {} as PlatformMcpToolContext['projectsService'],
    componentsService: { getStats: getStatsMock } as unknown as ComponentsService,
    containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
    imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
    cvesService: {} as PlatformMcpToolContext['cvesService'],
    cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
  };

  beforeEach(() => {
    getStatsMock.mockReset();
  });

  it('delegates to ComponentsService.getStats and returns ImageCveStats JSON', async () => {
    const stats: ImageCveStats = {
      scope: { enabledOnly: true, latestImageOnlyPerComponent: true },
      totals: { enabledImageCves: 1 },
      byVexStatus: {
        under_investigation: {
          total: 1,
          severity: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        },
        not_affected: {
          total: 0,
          severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        },
        affected: {
          total: 0,
          severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        },
      },
    };
    getStatsMock.mockResolvedValue(stats);

    const result = await getComponentImageCveStatsToolHandler(ctx, { projectId, componentId });

    expect(getStatsMock).toHaveBeenCalledWith(projectId, componentId);
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual(stats);
  });

  it('returns isError when project or component is not found', async () => {
    getStatsMock.mockRejectedValue(new NotFoundException('Component x not found'));

    const result = await getComponentImageCveStatsToolHandler(ctx, { projectId, componentId });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});
