import { NotFoundException } from '@nestjs/common';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

import { getCurrentImageToolHandler } from '../../src/mcp/tools/container_images.js';
import type { PlatformMcpToolContext } from '../../src/mcp/context.js';
import type { ContainerImagesService } from '../../src/server/container_images/container_images.service.js';
import type { ContainerImage } from '../../src/db/entities/container_images/definition.js';
import type { Component } from '../../src/db/entities/components/definition.js';
import type { StoredFile } from '../../src/db/entities/stored_files/definition.js';

describe('get_current_image MCP tool', () => {
  const projectId = '550e8400-e29b-41d4-a716-446655440000';
  const componentId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const imageId = '7c9e6731-9dad-11d1-80b4-00c04fd430c9';
  const storedFileId = '8daf8842-9dad-11d1-80b4-00c04fd430ca';

  const getCurrentMock = jest.fn<ContainerImagesService['getCurrent']>();

  const ctx: PlatformMcpToolContext = {
    dataSource: {} as PlatformMcpToolContext['dataSource'],
    mcpLogger: {} as PlatformMcpToolContext['mcpLogger'],
    projectsService: {} as PlatformMcpToolContext['projectsService'],
    componentsService: {} as PlatformMcpToolContext['componentsService'],
    containerImagesService: { getCurrent: getCurrentMock } as unknown as ContainerImagesService,
    imageCvesService: {} as PlatformMcpToolContext['imageCvesService'],
    cvesService: {} as PlatformMcpToolContext['cvesService'],
    cveResearchDocumentsService: {} as PlatformMcpToolContext['cveResearchDocumentsService'],
  };

  beforeEach(() => {
    getCurrentMock.mockReset();
  });

  it('delegates to ContainerImagesService.getCurrent and returns ContainerImageResponseDto-shaped JSON', async () => {
    const component = { id: componentId } as Component;
    const storedFile = {
      id: storedFileId,
      status: 'ready',
      extension: 'tar',
      sizeBytes: '999',
      uploadStartedAtUnixSeconds: 10n,
    } as StoredFile;
    const row: ContainerImage = {
      id: imageId,
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

    const result = await getCurrentImageToolHandler(ctx, { projectId, componentId });

    expect(getCurrentMock).toHaveBeenCalledWith(projectId, componentId);
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual({
      id: imageId,
      componentId,
      storedFileId,
      chainIndex: 2,
      fileStatus: 'ready',
      fileExtension: 'tar',
      fileSizeBytes: '999',
      fileUploadStartedAtUnixSeconds: '10',
      createdAtUnixSeconds: '1',
      uploadFinishedAtUnixSeconds: '5',
      scanResultCode: 'ok',
      scanAttemptedAtUnixSeconds: '3',
      scanFinishedAtUnixSeconds: '4',
    });
  });

  it('returns isError when image cannot be resolved', async () => {
    getCurrentMock.mockRejectedValue(
      new NotFoundException(`No images found for component ${componentId} in project ${projectId}`),
    );

    const result = await getCurrentImageToolHandler(ctx, { projectId, componentId });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No images');
  });
});
