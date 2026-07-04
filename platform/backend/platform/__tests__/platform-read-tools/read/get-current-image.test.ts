import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import {
    containerImageToResponsePayload,
    getCurrentImage,
    serializeContainerImage,
} from '../../../src/platform-read-tools/read/get-current-image.js';
import type { PlatformReadToolContext } from '../../../src/platform-read-tools/context.js';
import type { ContainerImagesService } from '../../../src/server/container_images/container_images.service.js';
import type { ContainerImage } from '../../../src/db/entities/container_images/definition.js';
import type { Component } from '../../../src/db/entities/components/definition.js';
import type { StoredFile } from '../../../src/db/entities/stored_files/definition.js';

describe('platform-read-tools get_current_image', () => {
    const projectId = '550e8400-e29b-41d4-a716-446655440000';
    const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const getCurrentMock = jest.fn<ContainerImagesService['getCurrent']>();

    const ctx: PlatformReadToolContext = {
        projectsService: {} as PlatformReadToolContext['projectsService'],
        componentsService: {} as PlatformReadToolContext['componentsService'],
        containerImagesService: { getCurrent: getCurrentMock } as unknown as ContainerImagesService,
        imageCvesService: {} as PlatformReadToolContext['imageCvesService'],
        cvesService: {} as PlatformReadToolContext['cvesService'],
        cveResearchDocumentsService: {} as PlatformReadToolContext['cveResearchDocumentsService'],
    };

    beforeEach(() => {
        getCurrentMock.mockReset();
    });

    it('getCurrentImage returns entity and serializeContainerImage matches payload', async () => {
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

        const image = await getCurrentImage(ctx, { projectId, componentId });

        expect(getCurrentMock).toHaveBeenCalledWith(projectId, componentId);
        expect(JSON.parse(serializeContainerImage(image))).toEqual(containerImageToResponsePayload(row));
    });

    it('getCurrentImage propagates NotFoundException', async () => {
        getCurrentMock.mockRejectedValue(new NotFoundException('No images found'));

        await expect(getCurrentImage(ctx, { projectId, componentId })).rejects.toThrow(NotFoundException);
    });
});
