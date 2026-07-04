import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    createGetCveTool,
    cveToResponsePayload,
    getCveDbHandler,
} from '../../../../../src/agents/tool-registry/db/read/get-cve.js';
import type { PlatformDbToolContext } from '../../../../../src/agents/tool-registry/db/context.js';
import type { CvesService } from '../../../../../src/server/components/cves/cves.service.js';
import type { Cve } from '../../../../../src/db/entities/cves/definition.js';

describe('get_cve db tool', () => {
    const getByIdMock = jest.fn<CvesService['getById']>();

    const ctx: PlatformDbToolContext = {
        projectsService: {} as PlatformDbToolContext['projectsService'],
        componentsService: {} as PlatformDbToolContext['componentsService'],
        containerImagesService: {} as PlatformDbToolContext['containerImagesService'],
        imageCvesService: {} as PlatformDbToolContext['imageCvesService'],
        cvesService: { getById: getByIdMock } as unknown as CvesService,
        cveResearchDocumentsService: {} as PlatformDbToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        getByIdMock.mockReset();
    });

    it('cveToResponsePayload stringifies bigint timestamps', () => {
        const row: Cve = {
            cveId: 'CVE-2024-12345',
            severity: 'HIGH',
            intelHighlights: null,
            intelLastAttemptAtUnixSeconds: 1n,
            intelUpdatedAtUnixSeconds: 2n,
            researchSummary: 'notes',
        } as Cve;

        expect(cveToResponsePayload(row)).toEqual({
            cveId: 'CVE-2024-12345',
            severity: 'HIGH',
            intelHighlights: null,
            intelLastAttemptAtUnixSeconds: '1',
            intelUpdatedAtUnixSeconds: '2',
            researchSummary: 'notes',
        });
    });

    it('getCveDbHandler delegates to CvesService.getById', async () => {
        const row: Cve = {
            cveId: 'CVE-2024-12345',
            severity: 'HIGH',
            intelHighlights: null,
            intelLastAttemptAtUnixSeconds: 1n,
            intelUpdatedAtUnixSeconds: 2n,
            researchSummary: 'notes',
        } as Cve;
        getByIdMock.mockResolvedValue(row);

        const text = await getCveDbHandler(ctx, { cveId: 'CVE-2024-12345' });

        expect(getByIdMock).toHaveBeenCalledWith('CVE-2024-12345');
        expect(JSON.parse(text)).toEqual(cveToResponsePayload(row));
    });

    it('getCveDbHandler returns ERROR prefix when not found', async () => {
        getByIdMock.mockRejectedValue(new NotFoundException('CVE CVE-2024-12345 not found'));

        const text = await getCveDbHandler(ctx, { cveId: 'CVE-2024-12345' });

        expect(text).toMatch(/^ERROR:/);
        expect(text).toContain('not found');
    });

    it('createGetCveTool invokes handler via LangChain', async () => {
        getByIdMock.mockResolvedValue({
            cveId: 'CVE-2024-99999',
            severity: 'LOW',
            intelHighlights: null,
            intelLastAttemptAtUnixSeconds: 0n,
            intelUpdatedAtUnixSeconds: 0n,
            researchSummary: '',
        } as Cve);

        const tool = createGetCveTool(ctx);
        const result = await tool.invoke({ cveId: 'CVE-2024-99999' });

        expect(result).toContain('CVE-2024-99999');
    });
});
