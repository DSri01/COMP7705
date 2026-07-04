import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    createListImageCvesTool,
    listImageCvesDbHandler,
} from '../../../../../src/agents/tool-registry/db/read/list-image-cves.js';
import type { PlatformDbToolContext } from '../../../../../src/agents/tool-registry/db/context.js';
import type { ImageCvesService } from '../../../../../src/server/components/image_cves/image_cves.service.js';
import type { ImageCveListItemDto } from '../../../../../src/server/components/image_cves/image_cves.types.js';

describe('list_image_cves db tool', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const listMock = jest.fn<ImageCvesService['list']>();

    const ctx: PlatformDbToolContext = {
        projectsService: {} as PlatformDbToolContext['projectsService'],
        componentsService: {} as PlatformDbToolContext['componentsService'],
        containerImagesService: {} as PlatformDbToolContext['containerImagesService'],
        imageCvesService: { list: listMock } as unknown as ImageCvesService,
        cvesService: {} as PlatformDbToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformDbToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        listMock.mockReset();
    });

    it('listImageCvesDbHandler delegates to ImageCvesService.list', async () => {
        const item = { imageCveId: '9eb09953-9dad-11d1-80b4-00c04fd430cb', cveId: 'CVE-2024-0001' } as ImageCveListItemDto;
        listMock.mockResolvedValue({ imageCves: [item] });

        const text = await listImageCvesDbHandler(ctx, { projectId, componentId });

        expect(listMock).toHaveBeenCalledWith(projectId, componentId);
        expect(JSON.parse(text)).toEqual({ imageCves: [item] });
    });

    it('listImageCvesDbHandler returns ERROR when not found', async () => {
        listMock.mockRejectedValue(new NotFoundException('No container image'));

        const text = await listImageCvesDbHandler(ctx, { projectId, componentId });

        expect(text).toMatch(/^ERROR:/);
    });

    it('createListImageCvesTool invokes handler via LangChain', async () => {
        listMock.mockResolvedValue({
            imageCves: [
                {
                    imageCveId: '9eb09953-9dad-11d1-80b4-00c04fd430cb',
                    cveId: 'CVE-2024-0001',
                } as ImageCveListItemDto,
            ],
        });

        const tool = createListImageCvesTool(ctx);
        const result = await tool.invoke({ projectId, componentId });

        expect(result).toContain('CVE-2024-0001');
    });
});
