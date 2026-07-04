import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { ContainerImagesController } from '../../../src/server/container_images/container_images.controller.js';
import { ContainerImagesService } from '../../../src/server/container_images/container_images.service.js';

describe('ContainerImagesController', () => {
  let controller: ContainerImagesController;

  type ContainerImagesServiceMock = Pick<
    jest.Mocked<ContainerImagesService>,
    'create' | 'getCurrent' | 'getById' | 'list' | 'upload'
  >;

  const serviceMock: ContainerImagesServiceMock = {
    create: jest.fn<ContainerImagesService['create']>(),
    getCurrent: jest.fn<ContainerImagesService['getCurrent']>(),
    getById: jest.fn<ContainerImagesService['getById']>(),
    list: jest.fn<ContainerImagesService['list']>(),
    upload: jest.fn<ContainerImagesService['upload']>(),
  };

  const makeImage = () => ({
    id: 'img-1',
    component: {
      id: 'comp-1',
      name: 'authService',
      description: 'desc',
      project: {
        id: 'proj-1',
        name: 'proj',
        description: 'proj desc',
        createdAtUnixSeconds: 1n,
        updatedAtUnixSeconds: 1n,
      },
      createdAtUnixSeconds: 1n,
      updatedAtUnixSeconds: 1n,
    },
    chainIndex: 2,
    storedFile: {
      id: 'sf-1',
      extension: 'tar',
      sizeBytes: '42',
      status: 'ready' as const,
      uploadStartedAtUnixSeconds: 1n,
      createdAtUnixSeconds: 1n,
    },
    createdAtUnixSeconds: 1n,
    uploadFinishedAtUnixSeconds: 2n,
    scanResultCode: 'ok' as const,
    scanAttemptedAtUnixSeconds: 0n,
    scanFinishedAtUnixSeconds: 0n,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContainerImagesController],
      providers: [{ provide: ContainerImagesService, useValue: serviceMock }],
    }).compile();

    controller = module.get<ContainerImagesController>(ContainerImagesController);
    jest.clearAllMocks();
  });

  it('create() delegates to service', async () => {
    serviceMock.create.mockResolvedValue(makeImage());
    const result = await controller.create('proj-1', 'comp-1');
    expect(serviceMock.create).toHaveBeenCalledWith('proj-1', 'comp-1');
    expect(result.id).toBe('img-1');
    expect(result.storedFileId).toBe('sf-1');
  });

  it('getCurrent() delegates to service', async () => {
    serviceMock.getCurrent.mockResolvedValue(makeImage());
    const result = await controller.getCurrent('proj-1', 'comp-1');
    expect(serviceMock.getCurrent).toHaveBeenCalledWith('proj-1', 'comp-1');
    expect(result.chainIndex).toBe(2);
  });

  it('getById() delegates to service', async () => {
    serviceMock.getById.mockResolvedValue(makeImage());
    const result = await controller.getById('proj-1', 'comp-1', 'img-1');
    expect(serviceMock.getById).toHaveBeenCalledWith('proj-1', 'comp-1', 'img-1');
    expect(result.fileStatus).toBe('ready');
    expect(result.scanAttemptedAtUnixSeconds).toBe('0');
    expect(result.scanFinishedAtUnixSeconds).toBe('0');
  });

  it('list() delegates to service', async () => {
    serviceMock.list.mockResolvedValue([makeImage()]);
    const result = await controller.list('proj-1', 'comp-1');
    expect(serviceMock.list).toHaveBeenCalledWith('proj-1', 'comp-1');
    expect(result).toHaveLength(1);
  });

  it('upload() delegates to service', async () => {
    serviceMock.upload.mockResolvedValue(makeImage());
    const file = { originalname: 'image.tar', size: 10 };
    const result = await controller.upload('proj-1', 'comp-1', 'img-1', file);
    expect(serviceMock.upload).toHaveBeenCalledWith('proj-1', 'comp-1', 'img-1', file);
    expect(result.fileExtension).toBe('tar');
  });

  it('propagates NotFoundException from service', async () => {
    const err = new NotFoundException('Image missing');
    serviceMock.getById.mockRejectedValue(err);
    await expect(controller.getById('proj-1', 'comp-1', 'missing')).rejects.toBe(err);
  });
});
