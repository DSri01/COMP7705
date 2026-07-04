import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { listCveResearchDocumentsToolHandler } from '../../src/mcp/tools/cve_research_documents.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { CveResearchDocumentsService } from '../../src/server/components/cve_research_documents/cve_research_documents.service.js';
import type { CveResearchDocument } from '../../src/db/entities/cve_research_documents/definition.js';
import type { Cve } from '../../src/db/entities/cves/definition.js';

describe('list_cve_research_documents MCP tool', () => {
  const cveId = 'CVE-2024-12345';

  const listMock = jest.fn<CveResearchDocumentsService['list']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: {} as PlatformMcpToolContext['projectsService'],
    componentsService: {} as PlatformMcpToolContext['componentsService'],
    containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
    imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
    cvesService: {} as PlatformMcpToolContext['cvesService'],
    cveResearchDocumentsService: { list: listMock } as unknown as CveResearchDocumentsService,
  };

  beforeEach(() => {
    listMock.mockReset();
  });

  it('delegates to CveResearchDocumentsService.list and omits content', async () => {
    const cve = { cveId } as Cve;
    const doc: CveResearchDocument = {
      id: '9eb09953-9dad-11d1-80b4-00c04fd430cb',
      cve,
      source: 'user_upload',
      title: 'Notes',
      content: 'very large body'.repeat(1000),
      createdAtUnixSeconds: 99n,
    } as CveResearchDocument;
    listMock.mockResolvedValue([doc]);

    const result = await listCveResearchDocumentsToolHandler(ctx, { cveId });

    expect(listMock).toHaveBeenCalledWith(cveId);
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text) as unknown[];
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      id: doc.id,
      cveId,
      source: 'user_upload',
      title: 'Notes',
      createdAtUnixSeconds: '99',
    });
    expect(JSON.stringify(parsed)).not.toContain('very large body');
  });

  it('returns isError when CVE is not found', async () => {
    listMock.mockRejectedValue(new NotFoundException(`CVE ${cveId} not found`));

    const result = await listCveResearchDocumentsToolHandler(ctx, { cveId });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  it('returns empty JSON array when there are no documents', async () => {
    listMock.mockResolvedValue([]);

    const result = await listCveResearchDocumentsToolHandler(ctx, { cveId });

    expect(JSON.parse(result.content[0].text)).toEqual([]);
  });
});
