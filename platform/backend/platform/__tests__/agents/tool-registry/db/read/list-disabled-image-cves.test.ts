import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    createListDisabledImageCvesTool,
    listDisabledImageCvesDbHandler,
} from '../../../../../src/agents/tool-registry/db/read/list-disabled-image-cves.js';
import type { PlatformDbToolContext } from '../../../../../src/agents/tool-registry/db/context.js';
import type { ImageCvesService } from '../../../../../src/server/components/image_cves/image_cves.service.js';

describe('list_disabled_image_cves db tool', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const listDisabledMock = jest.fn<ImageCvesService['listDisabled']>();

    const ctx: PlatformDbToolContext = {
        projectsService: {} as PlatformDbToolContext['projectsService'],
        componentsService: {} as PlatformDbToolContext['componentsService'],
        containerImagesService: {} as PlatformDbToolContext['containerImagesService'],
        imageCvesService: { listDisabled: listDisabledMock } as unknown as ImageCvesService,
        cvesService: {} as PlatformDbToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformDbToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        listDisabledMock.mockReset();
    });

    it('listDisabledImageCvesDbHandler delegates to ImageCvesService.listDisabled', async () => {
        listDisabledMock.mockResolvedValue({ imageCves: [] });

        const text = await listDisabledImageCvesDbHandler(ctx, { projectId, componentId });

        expect(listDisabledMock).toHaveBeenCalledWith(projectId, componentId);
        expect(JSON.parse(text)).toEqual({ imageCves: [] });
    });

    it('listDisabledImageCvesDbHandler returns ERROR when not found', async () => {
        listDisabledMock.mockRejectedValue(new NotFoundException('No container image'));

        const text = await listDisabledImageCvesDbHandler(ctx, { projectId, componentId });

        expect(text).toMatch(/^ERROR:/);
    });

    it('createListDisabledImageCvesTool invokes handler via LangChain', async () => {
        listDisabledMock.mockResolvedValue({ imageCves: [] });

        const tool = createListDisabledImageCvesTool(ctx);
        const result = await tool.invoke({ projectId, componentId });

        expect(JSON.parse(String(result))).toEqual({ imageCves: [] });
    });
});
