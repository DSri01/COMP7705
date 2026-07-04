import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { getCveResearchDocumentToolHandler } from '../../src/mcp/tools/cve_research_documents.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { CveResearchDocumentsService } from '../../src/server/components/cve_research_documents/cve_research_documents.service.js';
import type { CveResearchDocument } from '../../src/db/entities/cve_research_documents/definition.js';
import type { Cve } from '../../src/db/entities/cves/definition.js';

describe('get_cve_research_document MCP tool', () => {
  const cveId = 'CVE-2024-12345';
  const documentId = '9eb09953-9dad-11d1-80b4-00c04fd430cb';

  const getByIdMock = jest.fn<CveResearchDocumentsService['getById']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: {} as PlatformMcpToolContext['projectsService'],
    componentsService: {} as PlatformMcpToolContext['componentsService'],
    containerImagesService: {} as PlatformMcpToolContext['containerImagesService'],
    imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
    cvesService: {} as PlatformMcpToolContext['cvesService'],
    cveResearchDocumentsService: { getById: getByIdMock } as unknown as CveResearchDocumentsService,
  };

  beforeEach(() => {
    getByIdMock.mockReset();
  });

  it('delegates to CveResearchDocumentsService.getById and returns full CveResearchDocumentResponseDto JSON', async () => {
    const cve = { cveId } as Cve;
    const doc: CveResearchDocument = {
      id: documentId,
      cve,
      source: 'user_upload',
      title: 'Notes',
      content: 'full markdown body',
      createdAtUnixSeconds: 42n,
    } as CveResearchDocument;
    getByIdMock.mockResolvedValue(doc);

    const result = await getCveResearchDocumentToolHandler(ctx, { cveId, documentId });

    expect(getByIdMock).toHaveBeenCalledWith(cveId, documentId);
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual({
      id: documentId,
      cveId,
      source: 'user_upload',
      title: 'Notes',
      content: 'full markdown body',
      createdAtUnixSeconds: '42',
    });
  });

  it('returns isError when CVE or document is not found', async () => {
    getByIdMock.mockRejectedValue(new NotFoundException('Research document x not found'));

    const result = await getCveResearchDocumentToolHandler(ctx, { cveId, documentId });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});
