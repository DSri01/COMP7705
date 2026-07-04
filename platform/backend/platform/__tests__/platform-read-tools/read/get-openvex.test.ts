import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { getOpenVex, serializeOpenVex } from '../../../src/platform-read-tools/read/get-openvex.js';
import type { PlatformReadToolContext } from '../../../src/platform-read-tools/context.js';
import type { ComponentsService } from '../../../src/server/components/components.service.js';

describe('platform-read-tools get_openvex', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    const exportVexMock = jest.fn<ComponentsService['exportVex']>();

    const ctx: PlatformReadToolContext = {
        projectsService: {} as PlatformReadToolContext['projectsService'],
        componentsService: { exportVex: exportVexMock } as unknown as ComponentsService,
        containerImagesService: {} as PlatformReadToolContext['containerImagesService'],
        imageCvesService: {} as PlatformReadToolContext['imageCvesService'],
        cvesService: {} as PlatformReadToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformReadToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        exportVexMock.mockReset();
    });

    it('getOpenVex delegates to ComponentsService.exportVex', async () => {
        const doc = { '@context': 'https://openvex.dev/ns/v0.2.0', statements: [] };
        exportVexMock.mockResolvedValue(doc);

        const result = await getOpenVex(ctx, { projectId, componentId });

        expect(exportVexMock).toHaveBeenCalledWith(projectId, componentId);
        expect(JSON.parse(serializeOpenVex(result))).toEqual(doc);
    });

    it('propagates NotFoundException', async () => {
        exportVexMock.mockRejectedValue(new NotFoundException('Component x not found'));

        await expect(getOpenVex(ctx, { projectId, componentId })).rejects.toThrow(NotFoundException);
    });
});
