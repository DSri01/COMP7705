import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    agentLookupCreateToResponsePayload,
    createAgentLookup,
    serializeAgentLookupCreate,
} from '../../../src/platform-write-tools/write/create-agent-lookup.js';
import type { PlatformWriteToolContext } from '../../../src/platform-write-tools/context.js';
import type { CveResearchDocumentsService } from '../../../src/server/components/cve_research_documents/cve_research_documents.service.js';
import type { CveResearchDocument } from '../../../src/db/entities/cve_research_documents/definition.js';
import type { Cve } from '../../../src/db/entities/cves/definition.js';

describe('platform-write-tools create_agent_lookup', () => {
    const cveId = 'CVE-2024-12345';
    const documentId = '9eb09953-9dad-11d1-80b4-00c04fd430cb';
    const createdAtUnixSeconds = 1_746_724_800n;

    const createAgentLookupMock = jest.fn<CveResearchDocumentsService['createAgentLookup']>();

    const ctx: PlatformWriteToolContext = {
        projectsService: {} as PlatformWriteToolContext['projectsService'],
        componentsService: {} as PlatformWriteToolContext['componentsService'],
        containerImagesService: {} as PlatformWriteToolContext['containerImagesService'],
        imageCvesService: {} as PlatformWriteToolContext['imageCvesService'],
        cvesService: {} as PlatformWriteToolContext['cvesService'],
        cveResearchDocumentsService: {
            createAgentLookup: createAgentLookupMock,
        } as unknown as CveResearchDocumentsService,
    };

    const doc: CveResearchDocument = {
        id: documentId,
        cve: { cveId } as Cve,
        source: 'agent_lookup',
        title: 'Advisory — https://example.com — fetched at: 2025-05-08T17:20:00Z',
        content: 'body',
        createdAtUnixSeconds,
    } as CveResearchDocument;

    beforeEach(() => {
        createAgentLookupMock.mockReset();
    });

    it('createAgentLookup delegates to CveResearchDocumentsService.createAgentLookup', async () => {
        createAgentLookupMock.mockResolvedValue(doc);

        const row = await createAgentLookup(ctx, {
            cveId,
            title: doc.title,
            content: doc.content,
            createdAtUnixSeconds,
        });

        expect(createAgentLookupMock).toHaveBeenCalledWith(cveId, {
            title: doc.title,
            content: doc.content,
            createdAtUnixSeconds,
        });
        expect(JSON.parse(serializeAgentLookupCreate(row))).toEqual(
            agentLookupCreateToResponsePayload(doc),
        );
    });

    it('agentLookupCreateToResponsePayload omits content', () => {
        expect(agentLookupCreateToResponsePayload(doc)).toEqual({
            ok: true,
            id: documentId,
            cveId,
            source: 'agent_lookup',
            title: doc.title,
            createdAtUnixSeconds: createdAtUnixSeconds.toString(),
            readWith: 'get_cve_research_document',
            documentId,
        });
    });

    it('propagates NotFoundException', async () => {
        createAgentLookupMock.mockRejectedValue(new NotFoundException(`CVE ${cveId} not found`));

        await expect(
            createAgentLookup(ctx, {
                cveId,
                title: 't',
                content: 'c',
                createdAtUnixSeconds,
            }),
        ).rejects.toThrow(NotFoundException);
    });
});
