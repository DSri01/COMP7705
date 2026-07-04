import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    getImageCve,
    listDisabledImageCves,
    listImageCves,
    serializeImageCveDetail,
    serializeImageCveListPayload,
} from '../../../src/platform-read-tools/read/image-cves.js';
import type { PlatformReadToolContext } from '../../../src/platform-read-tools/context.js';
import type { ImageCvesService } from '../../../src/server/components/image_cves/image_cves.service.js';
import type { ImageCveDetailDto, ImageCveListItemDto } from '../../../src/server/components/image_cves/image_cves.types.js';

describe('platform-read-tools image_cves', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const imageCveId = '9eb09953-9dad-11d1-80b4-00c04fd430cb';

    const listMock = jest.fn<ImageCvesService['list']>();
    const listDisabledMock = jest.fn<ImageCvesService['listDisabled']>();
    const getByIdMock = jest.fn<ImageCvesService['getById']>();

    const ctx: PlatformReadToolContext = {
        projectsService: {} as PlatformReadToolContext['projectsService'],
        componentsService: {} as PlatformReadToolContext['componentsService'],
        containerImagesService: {} as PlatformReadToolContext['containerImagesService'],
        imageCvesService: {
            list: listMock,
            listDisabled: listDisabledMock,
            getById: getByIdMock,
        } as unknown as ImageCvesService,
        cvesService: {} as PlatformReadToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformReadToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        listMock.mockReset();
        listDisabledMock.mockReset();
        getByIdMock.mockReset();
    });

    it('listImageCves delegates to ImageCvesService.list', async () => {
        const item = { imageCveId, cveId: 'CVE-2024-0001' } as ImageCveListItemDto;
        listMock.mockResolvedValue({ imageCves: [item] });

        const payload = await listImageCves(ctx, { projectId, componentId });

        expect(listMock).toHaveBeenCalledWith(projectId, componentId);
        expect(JSON.parse(serializeImageCveListPayload(payload))).toEqual({ imageCves: [item] });
    });

    it('listDisabledImageCves delegates to ImageCvesService.listDisabled', async () => {
        listDisabledMock.mockResolvedValue({ imageCves: [] });

        await listDisabledImageCves(ctx, { projectId, componentId });

        expect(listDisabledMock).toHaveBeenCalledWith(projectId, componentId);
    });

    it('getImageCve delegates to ImageCvesService.getById', async () => {
        const detail = { imageCveId, cveId: 'CVE-2024-0001' } as ImageCveDetailDto;
        getByIdMock.mockResolvedValue(detail);

        const row = await getImageCve(ctx, { projectId, componentId, imageCveId });

        expect(getByIdMock).toHaveBeenCalledWith(projectId, componentId, imageCveId);
        expect(JSON.parse(serializeImageCveDetail(row))).toEqual(detail);
    });

    it('propagates NotFoundException from service', async () => {
        listMock.mockRejectedValue(new NotFoundException('No container image'));

        await expect(listImageCves(ctx, { projectId, componentId })).rejects.toThrow(NotFoundException);
    });
});
