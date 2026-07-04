import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    agentLookupCreateToResponsePayload,
    createWebFetchUrlMarkdownTool,
    webFetchUrlMarkdownHandler,
} from '../../../../src/agents/tool-registry/web/web-fetch-url-markdown.js';
import type { PlatformDbToolContext } from '../../../../src/agents/tool-registry/db/context.js';
import type { CvesService } from '../../../../src/server/components/cves/cves.service.js';
import type { CveResearchDocumentsService } from '../../../../src/server/components/cve_research_documents/cve_research_documents.service.js';
import type { Cve } from '../../../../src/db/entities/cves/definition.js';
import type { CveResearchDocument } from '../../../../src/db/entities/cve_research_documents/definition.js';
import type { FetchAndParseResult } from '../../../../src/web/types.js';
import {
    PLATFORM_ASSISTANT_TURN_TOOL_LIMITS,
    PlatformAssistantTurnBudget,
} from '../../../../src/agents/agent-graphs/platform-assistant/turn-budget.js';

describe('web_fetch_url_markdown tool', () => {
    const cveId = 'CVE-2024-12345';
    const url = 'https://example.com/advisory';
    const documentId = '9eb09953-9dad-11d1-80b4-00c04fd430cb';
    const fetchedAtUnixSeconds = 1_746_724_800n;

    const getByIdMock = jest.fn<CvesService['getById']>();
    const createAgentLookupMock = jest.fn<CveResearchDocumentsService['createAgentLookup']>();
    const fetchAndParseMock = jest.fn<
        (url: string) => Promise<FetchAndParseResult>
    >();

    const ctx: PlatformDbToolContext = {
        projectsService: {} as PlatformDbToolContext['projectsService'],
        componentsService: {} as PlatformDbToolContext['componentsService'],
        containerImagesService: {} as PlatformDbToolContext['containerImagesService'],
        imageCvesService: {} as PlatformDbToolContext['imageCvesService'],
        cvesService: { getById: getByIdMock } as unknown as CvesService,
        cveResearchDocumentsService: {
            createAgentLookup: createAgentLookupMock,
        } as unknown as CveResearchDocumentsService,
    };

    const cve = {
        cveId,
        severity: 'HIGH',
        intelHighlights: null,
        intelLastAttemptAtUnixSeconds: 0n,
        intelUpdatedAtUnixSeconds: 0n,
        researchSummary: '',
    } as Cve;

    const doc: CveResearchDocument = {
        id: documentId,
        cve: { cveId } as Cve,
        source: 'agent_lookup',
        title: 'Advisory — https://example.com/advisory — fetched at: 2025-05-08T17:20:00Z',
        content: '> **Fetched at:** …\n\n# Hi',
        createdAtUnixSeconds: fetchedAtUnixSeconds,
    } as CveResearchDocument;

    beforeEach(() => {
        getByIdMock.mockReset();
        createAgentLookupMock.mockReset();
        fetchAndParseMock.mockReset();
    });

    it('webFetchUrlMarkdownHandler returns ERROR when CVE not found and does not fetch', async () => {
        getByIdMock.mockRejectedValue(new NotFoundException(`CVE ${cveId} not found`));

        const text = await webFetchUrlMarkdownHandler(
            ctx,
            { url, cveId },
            { fetchAndParseWebPage: fetchAndParseMock },
        );

        expect(getByIdMock).toHaveBeenCalledWith(cveId);
        expect(fetchAndParseMock).not.toHaveBeenCalled();
        expect(createAgentLookupMock).not.toHaveBeenCalled();
        expect(text).toMatch(/^ERROR:/);
        expect(text).toContain('not found');
    });

    it('webFetchUrlMarkdownHandler returns ERROR when fetch fails and does not persist', async () => {
        getByIdMock.mockResolvedValue(cve);
        fetchAndParseMock.mockResolvedValue({
            ok: false,
            error: 'HTTP 500 Internal Server Error for https://example.com/advisory',
        });

        const text = await webFetchUrlMarkdownHandler(
            ctx,
            { url, cveId },
            { fetchAndParseWebPage: fetchAndParseMock },
        );

        expect(getByIdMock).toHaveBeenCalledWith(cveId);
        expect(fetchAndParseMock).toHaveBeenCalledWith(url);
        expect(createAgentLookupMock).not.toHaveBeenCalled();
        expect(text).toBe('ERROR: HTTP 500 Internal Server Error for https://example.com/advisory');
    });

    it('webFetchUrlMarkdownHandler persists snapshot and returns metadata without content', async () => {
        getByIdMock.mockResolvedValue(cve);
        fetchAndParseMock.mockResolvedValue({
            ok: true,
            url,
            title: doc.title,
            content: doc.content,
            fetchedAtUnixSeconds,
        });
        createAgentLookupMock.mockResolvedValue(doc);

        const text = await webFetchUrlMarkdownHandler(
            ctx,
            { url, cveId },
            { fetchAndParseWebPage: fetchAndParseMock },
        );

        expect(getByIdMock).toHaveBeenCalledWith(cveId);
        expect(fetchAndParseMock).toHaveBeenCalledWith(url);
        expect(createAgentLookupMock).toHaveBeenCalledWith(cveId, {
            title: doc.title,
            content: doc.content,
            createdAtUnixSeconds: fetchedAtUnixSeconds,
        });

        const payload = JSON.parse(text);
        expect(payload).toEqual(agentLookupCreateToResponsePayload(doc));
        expect(payload).not.toHaveProperty('content');
    });

    it('webFetchUrlMarkdownHandler returns ERROR when turn budget is exhausted', async () => {
        const turnBudget = new PlatformAssistantTurnBudget();
        const budgetThreadId = 'fetch-budget-thread';
        turnBudget.beginTurn(budgetThreadId);
        const deps = {
            fetchAndParseWebPage: fetchAndParseMock,
            turnBudget,
            resolveThreadId: () => budgetThreadId,
        };

        getByIdMock.mockResolvedValue(cve);
        fetchAndParseMock.mockResolvedValue({
            ok: true,
            url,
            title: doc.title,
            content: doc.content,
            fetchedAtUnixSeconds,
        });
        createAgentLookupMock.mockResolvedValue(doc);

        for (let i = 0; i < PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.web_fetch_url_markdown; i++) {
            await webFetchUrlMarkdownHandler(ctx, { url, cveId }, deps);
        }

        const blocked = await webFetchUrlMarkdownHandler(ctx, { url, cveId }, deps);
        expect(blocked).toContain('ERROR:');
        expect(blocked).toContain('web_fetch_url_markdown');
        expect(getByIdMock).toHaveBeenCalledTimes(
            PLATFORM_ASSISTANT_TURN_TOOL_LIMITS.web_fetch_url_markdown,
        );
    });

    it('createWebFetchUrlMarkdownTool invokes handler via LangChain', async () => {
        getByIdMock.mockResolvedValue(cve);
        fetchAndParseMock.mockResolvedValue({
            ok: true,
            url,
            title: doc.title,
            content: doc.content,
            fetchedAtUnixSeconds,
        });
        createAgentLookupMock.mockResolvedValue(doc);

        const tool = createWebFetchUrlMarkdownTool(ctx, { fetchAndParseWebPage: fetchAndParseMock });
        const result = await tool.invoke({ url, cveId });

        expect(result).toContain('"ok": true');
        expect(result).toContain(documentId);
        expect(result).not.toContain('# Hi');
    });
});
