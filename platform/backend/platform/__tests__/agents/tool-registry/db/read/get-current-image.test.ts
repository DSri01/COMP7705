import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    containerImageToResponsePayload,
    createGetCurrentImageTool,
    getCurrentImageDbHandler,
} from '../../../../../src/agents/tool-registry/db/read/get-current-image.js';
import type { PlatformDbToolContext } from '../../../../../src/agents/tool-registry/db/context.js';
import type { ContainerImagesService } from '../../../../../src/server/container_images/container_images.service.js';
import type { ContainerImage } from '../../../../../src/db/entities/container_images/definition.js';
import type { Component } from '../../../../../src/db/entities/components/definition.js';
import type { StoredFile } from '../../../../../src/db/entities/stored_files/definition.js';

describe('get_current_image db tool', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const getCurrentMock = jest.fn<ContainerImagesService['getCurrent']>();

    const ctx: PlatformDbToolContext = {
        projectsService: {} as PlatformDbToolContext['projectsService'],
        componentsService: {} as PlatformDbToolContext['componentsService'],
        containerImagesService: { getCurrent: getCurrentMock } as unknown as ContainerImagesService,
        imageCvesService: {} as PlatformDbToolContext['imageCvesService'],
        cvesService: {} as PlatformDbToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformDbToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        getCurrentMock.mockReset();
    });

    it('getCurrentImageDbHandler delegates to ContainerImagesService.getCurrent', async () => {
        const component = { id: componentId } as Component;
        const storedFile = {
            id: '8daf8842-9dad-11d1-80b4-00c04fd430ca',
            status: 'ready',
            extension: 'tar',
            sizeBytes: '999',
            uploadStartedAtUnixSeconds: 10n,
        } as StoredFile;
        const row: ContainerImage = {
            id: '7c9e6731-9dad-11d1-80b4-00c04fd430c9',
            component,
            storedFile,
            chainIndex: 2,
            createdAtUnixSeconds: 1n,
            uploadFinishedAtUnixSeconds: 5n,
            scanResultCode: 'ok',
            scanAttemptedAtUnixSeconds: 3n,
            scanFinishedAtUnixSeconds: 4n,
        } as ContainerImage;
        getCurrentMock.mockResolvedValue(row);

        const text = await getCurrentImageDbHandler(ctx, { projectId, componentId });

        expect(getCurrentMock).toHaveBeenCalledWith(projectId, componentId);
        expect(JSON.parse(text)).toEqual(containerImageToResponsePayload(row));
    });

    it('getCurrentImageDbHandler returns ERROR when not found', async () => {
        getCurrentMock.mockRejectedValue(new NotFoundException('No images found'));

        const text = await getCurrentImageDbHandler(ctx, { projectId, componentId });

        expect(text).toMatch(/^ERROR:/);
    });

    it('createGetCurrentImageTool invokes handler via LangChain', async () => {
        getCurrentMock.mockResolvedValue({
            id: '7c9e6731-9dad-11d1-80b4-00c04fd430c9',
            component: { id: componentId } as Component,
            storedFile: {
                id: 'f',
                status: 'ready',
                extension: 'tar',
                sizeBytes: '1',
                uploadStartedAtUnixSeconds: null,
            } as StoredFile,
            chainIndex: 0,
            createdAtUnixSeconds: 0n,
            uploadFinishedAtUnixSeconds: null,
            scanResultCode: 'ok',
            scanAttemptedAtUnixSeconds: 0n,
            scanFinishedAtUnixSeconds: 0n,
        } as ContainerImage);

        const tool = createGetCurrentImageTool(ctx);
        const result = await tool.invoke({ projectId, componentId });

        expect(result).toContain(componentId);
    });
});
