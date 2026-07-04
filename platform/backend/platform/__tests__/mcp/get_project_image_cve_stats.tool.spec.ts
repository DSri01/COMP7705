import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { getProjectImageCveStatsToolHandler } from '../../src/mcp/tools/projects.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { ProjectsService } from '../../src/server/projects/projects.service.js';
import type { ImageCveStats } from '../../src/server/components/image_cves/image_cve_stats.js';

describe('get_project_image_cve_stats MCP tool', () => {
  const getStatsMock = jest.fn<ProjectsService['getStats']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: { getStats: getStatsMock } as unknown as ProjectsService,
    componentsService: {} as PlatformMcpToolContext['componentsService'],
    containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
    imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
    cvesService: {} as PlatformMcpToolContext['cvesService'],
    cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
  };

  beforeEach(() => {
    getStatsMock.mockReset();
  });

  it('delegates to ProjectsService.getStats and returns ImageCveStats JSON', async () => {
    const stats: ImageCveStats = {
      scope: { enabledOnly: true, latestImageOnlyPerComponent: true },
      totals: { enabledImageCves: 2 },
      byVexStatus: {
        under_investigation: {
          total: 1,
          severity: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        },
        not_affected: {
          total: 1,
          severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 1, LOW: 0, UNKNOWN: 0 },
        },
        affected: {
          total: 0,
          severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        },
      },
    };
    getStatsMock.mockResolvedValue(stats);

    const result = await getProjectImageCveStatsToolHandler(ctx, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(getStatsMock).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual(stats);
  });

  it('returns isError when project is not found', async () => {
    getStatsMock.mockRejectedValue(new NotFoundException('Project x not found'));

    const result = await getProjectImageCveStatsToolHandler(ctx, {
      projectId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});
