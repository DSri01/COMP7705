import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { getCveToolHandler } from '../../src/mcp/tools/cves.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { CvesService } from '../../src/server/components/cves/cves.service.js';
import type { Cve } from '../../src/db/entities/cves/definition.js';

describe('get_cve MCP tool', () => {
  const getByIdMock = jest.fn<CvesService['getById']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: {} as PlatformMcpToolContext['projectsService'],
    componentsService: {} as PlatformMcpToolContext['componentsService'],
    containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
    imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
    cvesService: { getById: getByIdMock } as unknown as CvesService,
    cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
  };

  beforeEach(() => {
    getByIdMock.mockReset();
  });

  it('delegates to CvesService.getById and returns CveResponseDto-shaped JSON', async () => {
    const row: Cve = {
      cveId: 'CVE-2024-12345',
      severity: 'HIGH',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 1n,
      intelUpdatedAtUnixSeconds: 2n,
      researchSummary: 'notes',
    } as Cve;
    getByIdMock.mockResolvedValue(row);

    const result = await getCveToolHandler(ctx, { cveId: 'CVE-2024-12345' });

    expect(getByIdMock).toHaveBeenCalledWith('CVE-2024-12345');
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual({
      cveId: 'CVE-2024-12345',
      severity: 'HIGH',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: '1',
      intelUpdatedAtUnixSeconds: '2',
      researchSummary: 'notes',
    });
  });

  it('returns isError when CVE is not found', async () => {
    getByIdMock.mockRejectedValue(new NotFoundException('CVE CVE-2024-12345 not found'));

    const result = await getCveToolHandler(ctx, { cveId: 'CVE-2024-12345' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  it('returns isError on BadRequestException from service', async () => {
    getByIdMock.mockRejectedValue(new BadRequestException('Invalid CVE id: x'));

    const result = await getCveToolHandler(ctx, { cveId: 'CVE-2024-12345' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid CVE');
  });
});
