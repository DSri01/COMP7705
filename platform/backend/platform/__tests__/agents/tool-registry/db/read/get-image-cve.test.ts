import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    createGetImageCveTool,
    getImageCveDbHandler,
} from '../../../../../src/agents/tool-registry/db/read/get-image-cve.js';
import type { PlatformDbToolContext } from '../../../../../src/agents/tool-registry/db/context.js';
import type { ImageCvesService } from '../../../../../src/server/components/image_cves/image_cves.service.js';
import type { ImageCveDetailDto } from '../../../../../src/server/components/image_cves/image_cves.types.js';

describe('get_image_cve db tool', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const imageCveId = '9eb09953-9dad-11d1-80b4-00c04fd430cb';
    const getByIdMock = jest.fn<ImageCvesService['getById']>();

    const ctx: PlatformDbToolContext = {
        projectsService: {} as PlatformDbToolContext['projectsService'],
        componentsService: {} as PlatformDbToolContext['componentsService'],
        containerImagesService: {} as PlatformDbToolContext['containerImagesService'],
        imageCvesService: { getById: getByIdMock } as unknown as ImageCvesService,
        cvesService: {} as PlatformDbToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformDbToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        getByIdMock.mockReset();
    });

    it('getImageCveDbHandler delegates to ImageCvesService.getById', async () => {
        const detail = { imageCveId, cveId: 'CVE-2024-0001' } as ImageCveDetailDto;
        getByIdMock.mockResolvedValue(detail);

        const text = await getImageCveDbHandler(ctx, { projectId, componentId, imageCveId });

        expect(getByIdMock).toHaveBeenCalledWith(projectId, componentId, imageCveId);
        expect(JSON.parse(text)).toEqual(detail);
    });

    it('getImageCveDbHandler returns ERROR when not found', async () => {
        getByIdMock.mockRejectedValue(new NotFoundException('Image CVE x not found'));

        const text = await getImageCveDbHandler(ctx, { projectId, componentId, imageCveId });

        expect(text).toMatch(/^ERROR:/);
    });

    it('createGetImageCveTool invokes handler via LangChain', async () => {
        getByIdMock.mockResolvedValue({ imageCveId, cveId: 'CVE-2024-0001' } as ImageCveDetailDto);

        const tool = createGetImageCveTool(ctx);
        const result = await tool.invoke({ projectId, componentId, imageCveId });

        expect(result).toContain('CVE-2024-0001');
    });
});
