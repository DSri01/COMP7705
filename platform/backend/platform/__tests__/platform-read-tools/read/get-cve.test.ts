import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    cveToResponsePayload,
    getCve,
    serializeCve,
} from '../../../src/platform-read-tools/read/get-cve.js';
import type { PlatformReadToolContext } from '../../../src/platform-read-tools/context.js';
import type { CvesService } from '../../../src/server/components/cves/cves.service.js';
import type { Cve } from '../../../src/db/entities/cves/definition.js';

describe('platform-read-tools get_cve', () => {
    const getByIdMock = jest.fn<CvesService['getById']>();

    const ctx: PlatformReadToolContext = {
        projectsService: {} as PlatformReadToolContext['projectsService'],
        componentsService: {} as PlatformReadToolContext['componentsService'],
        containerImagesService: {} as PlatformReadToolContext['containerImagesService'],
        imageCvesService: {} as PlatformReadToolContext['imageCvesService'],
        cvesService: { getById: getByIdMock } as unknown as CvesService,
        cveResearchDocumentsService: {} as PlatformReadToolContext['cveResearchDocumentsService'],
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

    it('getCve delegates to CvesService.getById', async () => {
        const row: Cve = {
            cveId: 'CVE-2024-12345',
            severity: 'HIGH',
            intelHighlights: null,
            intelLastAttemptAtUnixSeconds: 1n,
            intelUpdatedAtUnixSeconds: 2n,
            researchSummary: 'notes',
        } as Cve;
        getByIdMock.mockResolvedValue(row);

        const cve = await getCve(ctx, { cveId: 'CVE-2024-12345' });

        expect(getByIdMock).toHaveBeenCalledWith('CVE-2024-12345');
        expect(cve).toBe(row);
        expect(JSON.parse(serializeCve(cve))).toEqual(cveToResponsePayload(row));
    });

    it('getCve propagates NotFoundException', async () => {
        getByIdMock.mockRejectedValue(new NotFoundException('CVE CVE-2024-12345 not found'));

        await expect(getCve(ctx, { cveId: 'CVE-2024-12345' })).rejects.toThrow(NotFoundException);
    });
});
