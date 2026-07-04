import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

import { ContainerImagesService } from '../../../src/server/container_images/container_images.service.js';
import { DATA_SOURCE } from '../../../src/server/database/database.constants.js';
import { ContainerImage } from '../../../src/db/entities/container_images/definition.js';
import { Component } from '../../../src/db/entities/components/definition.js';
import { Project } from '../../../src/db/entities/projects/definition.js';
import { StoredFile } from '../../../src/db/entities/stored_files/definition.js';
import { ImageCve } from '../../../src/db/entities/image_cve/definition.js';
import { FileStorageService } from '../../../src/server/container_images/file-storage.service.js';

describe('ContainerImagesService', () => {
  let service: ContainerImagesService;

  type ContainerImageRepoSubset = {
    find: Repository<ContainerImage>['find'];
    findOne: Repository<ContainerImage>['findOne'];
    save: (entity: ContainerImage) => Promise<ContainerImage>;
    create: (entityLike: Partial<ContainerImage>) => ContainerImage;
  };

  type ComponentRepoSubset = {
    findOne: Repository<Component>['findOne'];
  };

  type StoredFileRepoSubset = {
    save: (entity: StoredFile) => Promise<StoredFile>;
    findOneBy: Repository<StoredFile>['findOneBy'];
  };

  const imageRepoMock: jest.Mocked<ContainerImageRepoSubset> = {
    find: jest.fn<ContainerImageRepoSubset['find']>(),
    findOne: jest.fn<ContainerImageRepoSubset['findOne']>(),
    save: jest.fn<ContainerImageRepoSubset['save']>(),
    create: jest.fn<ContainerImageRepoSubset['create']>(),
  };

  const componentRepoMock: jest.Mocked<ComponentRepoSubset> = {
    findOne: jest.fn<ComponentRepoSubset['findOne']>(),
  };

  const storedFileRepoMock: jest.Mocked<StoredFileRepoSubset> = {
    save: jest.fn<StoredFileRepoSubset['save']>(),
    findOneBy: jest.fn<StoredFileRepoSubset['findOneBy']>(),
  };

  const managerImageRepoMock: jest.Mocked<ContainerImageRepoSubset> = {
    find: jest.fn<ContainerImageRepoSubset['find']>(),
    findOne: jest.fn<ContainerImageRepoSubset['findOne']>(),
    save: jest.fn<ContainerImageRepoSubset['save']>(),
    create: jest.fn<ContainerImageRepoSubset['create']>(),
  };

  const managerComponentRepoMock: jest.Mocked<ComponentRepoSubset> = {
    findOne: jest.fn<ComponentRepoSubset['findOne']>(),
  };

  const managerStoredFileRepoMock: jest.Mocked<{
    save: (entity: StoredFile) => Promise<StoredFile>;
    create: (entityLike: Partial<StoredFile>) => StoredFile;
  }> = {
    save: jest.fn(),
    create: jest.fn(),
  };

  const managerImageCveRepoMock: jest.Mocked<{
    find: (options: unknown) => Promise<ImageCve[]>;
    save: (entity: ImageCve | ImageCve[]) => Promise<ImageCve | ImageCve[]>;
    create: (entityLike: Partial<ImageCve>) => ImageCve;
  }> = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const dataSourceMock: {
    getRepository: jest.Mock;
    transaction: jest.Mock;
  } = {
    getRepository: jest.fn(),
    transaction: jest.fn(),
  };

  const fileStorageServiceMock: Pick<jest.Mocked<FileStorageService>, 'storeUploadedFile'> = {
    storeUploadedFile: jest.fn<FileStorageService['storeUploadedFile']>(),
  };

  const makeProject = (): Project => ({
    id: 'proj-1',
    name: 'project',
    description: 'desc',
    createdAtUnixSeconds: 1n,
    updatedAtUnixSeconds: 1n,
  });

  const makeComponent = (): Component => ({
    id: 'comp-1',
    name: 'authService',
    description: 'component desc',
    project: makeProject(),
    createdAtUnixSeconds: 1n,
    updatedAtUnixSeconds: 1n,
  });

  const makeStoredFile = (overrides: Partial<StoredFile> = {}): StoredFile => ({
    id: 'sf-1',
    extension: null,
    sizeBytes: null,
    status: 'awaiting_upload',
    uploadStartedAtUnixSeconds: null,
    createdAtUnixSeconds: 1n,
    ...overrides,
  });

  const makeImage = (overrides: Partial<ContainerImage> = {}): ContainerImage => ({
    id: 'img-1',
    component: makeComponent(),
    chainIndex: 1,
    storedFile: makeStoredFile(),
    createdAtUnixSeconds: 1n,
    uploadFinishedAtUnixSeconds: null,
    ...overrides,
    scanResultCode: overrides.scanResultCode ?? 'ok',
    scanAttemptedAtUnixSeconds: overrides.scanAttemptedAtUnixSeconds ?? 0n,
    scanFinishedAtUnixSeconds: overrides.scanFinishedAtUnixSeconds ?? 0n,
  });

  const makeImageCve = (overrides: Partial<ImageCve> = {}): ImageCve => ({
    id: 'icve-1',
    containerImage: makeImage(),
    cve: {
      cveId: 'CVE-2021-44228',
      severity: 'UNKNOWN',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 0n,
      intelUpdatedAtUnixSeconds: 0n,
      researchSummary: '',
    } as ImageCve['cve'],
    source: 'manual',
    firstIntroducedChainIndex: 1,
    originalSource: 'manual',
    isDisabled: false,
    disabledReason: '',
    advice: null,
    storedInternalStatement: {
      status: 'under_investigation',
      context: { type: 'fresh' },
    },
    expiryTimeUnixSeconds: null,
    decisionRecordedAtUnixSeconds: 1n,
    ...overrides,
  });

  beforeEach(async () => {
    dataSourceMock.getRepository.mockImplementation((target: unknown) => {
      if (target === ContainerImage) return imageRepoMock as unknown as Repository<ContainerImage>;
      if (target === Component) return componentRepoMock as unknown as Repository<Component>;
      if (target === StoredFile) return storedFileRepoMock as unknown as Repository<StoredFile>;
      throw new Error('Unexpected repository target');
    });

    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const callback = args[1] as (manager: { getRepository: (target: unknown) => unknown }) => Promise<unknown>;
      const manager = {
        getRepository: (target: unknown) => {
          if (target === ContainerImage) return managerImageRepoMock;
          if (target === Component) return managerComponentRepoMock;
          if (target === StoredFile) return managerStoredFileRepoMock;
          if (target === ImageCve) return managerImageCveRepoMock;
          throw new Error('Unexpected manager repository target');
        },
      };
      return callback(manager);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContainerImagesService,
        { provide: DATA_SOURCE, useValue: dataSourceMock as unknown as DataSource },
        { provide: FileStorageService, useValue: fileStorageServiceMock },
      ],
    }).compile();

    service = module.get<ContainerImagesService>(ContainerImagesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('list() returns images for a component in descending chainIndex', async () => {
    componentRepoMock.findOne.mockResolvedValue(makeComponent());
    const image = makeImage();
    imageRepoMock.find.mockResolvedValue([image]);

    await expect(service.list('proj-1', 'comp-1')).resolves.toEqual([image]);
    expect(imageRepoMock.find).toHaveBeenCalledWith(expect.objectContaining({
      where: { component: { id: 'comp-1' } },
      order: { chainIndex: 'DESC' },
    }));
  });

  it('getCurrent() returns latest image', async () => {
    componentRepoMock.findOne.mockResolvedValue(makeComponent());
    const image = makeImage({ chainIndex: 3 });
    imageRepoMock.findOne.mockResolvedValue(image);

    const result = await service.getCurrent('proj-1', 'comp-1');
    expect(result.chainIndex).toBe(3);
  });

  it('getCurrent() throws when no image exists', async () => {
    componentRepoMock.findOne.mockResolvedValue(makeComponent());
    imageRepoMock.findOne.mockResolvedValue(null);

    await expect(service.getCurrent('proj-1', 'comp-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getById() returns image when found', async () => {
    componentRepoMock.findOne.mockResolvedValue(makeComponent());
    const image = makeImage();
    imageRepoMock.findOne.mockResolvedValue(image);

    await expect(service.getById('proj-1', 'comp-1', 'img-1')).resolves.toEqual(image);
  });

  it('create() creates stored_file and image in transaction', async () => {
    const component = makeComponent();
    const storedFile = makeStoredFile();
    const image = makeImage({ component, storedFile, chainIndex: 2 });

    managerComponentRepoMock.findOne.mockResolvedValue(component);
    managerImageRepoMock.findOne.mockResolvedValue(makeImage({ chainIndex: 1 }));
    managerStoredFileRepoMock.create.mockReturnValue(storedFile);
    managerStoredFileRepoMock.save.mockResolvedValue(storedFile);
    managerImageRepoMock.create.mockReturnValue(image);
    managerImageRepoMock.save.mockResolvedValue(image);
    managerImageCveRepoMock.find.mockResolvedValue([]);

    const result = await service.create('proj-1', 'comp-1');

    expect(dataSourceMock.transaction).toHaveBeenCalledTimes(1);
    expect(managerStoredFileRepoMock.save).toHaveBeenCalledWith(storedFile);
    expect(result.chainIndex).toBe(2);
  });

  it('create() copies previous image CVEs with chain semantics', async () => {
    const component = makeComponent();
    const previousImage = makeImage({ id: 'img-prev', chainIndex: 1, component });
    const storedFile = makeStoredFile();
    const newImage = makeImage({ id: 'img-new', chainIndex: 2, component, storedFile });

    const prevResolved = makeImageCve({
      id: 'icve-resolved',
      containerImage: previousImage,
      source: 'manual',
      firstIntroducedChainIndex: 1,
      originalSource: 'manual',
      isDisabled: true,
      disabledReason: 'suppression',
      advice: { content: 'keep this', adviceGeneratedAtUnixSeconds: '1699000000' },
      storedInternalStatement: {
        status: 'not_affected',
        justification: 'component_not_present',
        impact_statement: 'not present',
        status_notes: 'verified',
      },
      expiryTimeUnixSeconds: 888n,
      decisionRecordedAtUnixSeconds: 10n,
    });
    const prevUnderInvestigation = makeImageCve({
      id: 'icve-ui',
      containerImage: previousImage,
      source: 'fromScan',
      firstIntroducedChainIndex: 1,
      originalSource: 'fromScan',
      isDisabled: false,
      disabledReason: '',
      advice: null,
      storedInternalStatement: {
        status: 'under_investigation',
        context: {
          type: 'expired',
          expiredDecision: {
            status: 'affected',
            action_statement: 'patch',
            status_notes: 'old notes',
          },
        },
      },
      expiryTimeUnixSeconds: null,
      decisionRecordedAtUnixSeconds: 11n,
    });

    managerComponentRepoMock.findOne.mockResolvedValue(component);
    managerImageRepoMock.findOne.mockResolvedValue(previousImage);
    managerStoredFileRepoMock.create.mockReturnValue(storedFile);
    managerStoredFileRepoMock.save.mockResolvedValue(storedFile);
    managerImageRepoMock.create.mockReturnValue(newImage);
    managerImageRepoMock.save.mockResolvedValue(newImage);
    managerImageCveRepoMock.find.mockResolvedValue([prevResolved, prevUnderInvestigation]);
    managerImageCveRepoMock.create.mockImplementation((entityLike: Partial<ImageCve>) => entityLike as ImageCve);
    managerImageCveRepoMock.save.mockImplementation(async (entity) => entity);

    const result = await service.create('proj-1', 'comp-1');

    expect(result.id).toBe('img-new');
    expect(managerImageCveRepoMock.find).toHaveBeenCalledWith({
      where: { containerImage: { id: 'img-prev' } },
      relations: { cve: true },
    });
    expect(managerImageCveRepoMock.save).toHaveBeenCalledTimes(1);
    const copiedRows = managerImageCveRepoMock.save.mock.calls[0]?.[0] as ImageCve[];
    expect(copiedRows).toHaveLength(2);

    const copiedResolved = copiedRows.find((r) => r.isDisabled === true);
    expect(copiedResolved).toBeDefined();
    expect(copiedResolved?.source).toBe('fromChain');
    expect(copiedResolved?.isDisabled).toBe(true);
    expect(copiedResolved?.advice).toEqual({
      content: 'keep this',
      adviceGeneratedAtUnixSeconds: '1699000000',
    });
    expect(copiedResolved?.expiryTimeUnixSeconds).toBeNull();
    expect(copiedResolved?.storedInternalStatement.status).toBe('under_investigation');
    if (copiedResolved?.storedInternalStatement.status === 'under_investigation') {
      expect(copiedResolved.storedInternalStatement.context.type).toBe('carry_forward');
      if (copiedResolved.storedInternalStatement.context.type === 'carry_forward') {
        expect(copiedResolved.storedInternalStatement.context.priorDecision).toEqual({
          status: 'not_affected',
          justification: 'component_not_present',
          impact_statement: 'not present',
          status_notes: 'verified',
        });
      }
    }

    const copiedUi = copiedRows.find((r) => r.isDisabled === false);
    expect(copiedUi).toBeDefined();
    expect(copiedUi?.source).toBe('fromChain');
    expect(copiedUi?.storedInternalStatement.status).toBe('under_investigation');
    if (copiedUi?.storedInternalStatement.status === 'under_investigation') {
      expect(copiedUi.storedInternalStatement.context.type).toBe('expired');
    }
  });

  it('upload() transitions awaiting_upload image to ready', async () => {
    const storedFile = makeStoredFile();
    const image = makeImage({ storedFile });

    componentRepoMock.findOne.mockResolvedValue(makeComponent());
    imageRepoMock.findOne.mockResolvedValue(image);
    storedFileRepoMock.save.mockResolvedValue(storedFile);
    storedFileRepoMock.findOneBy.mockResolvedValue(storedFile);
    imageRepoMock.save.mockImplementation(async (entity) => entity);
    fileStorageServiceMock.storeUploadedFile.mockResolvedValue({ sizeBytes: '1234' });

    const result = await service.upload('proj-1', 'comp-1', 'img-1', {
      originalname: 'test-image.tar',
      size: 1234,
    });

    expect(storedFileRepoMock.save).toHaveBeenCalled();
    expect(result.uploadFinishedAtUnixSeconds).not.toBeNull();
  });

  it('upload() rejects non-tar extension', async () => {
    await expect(service.upload('proj-1', 'comp-1', 'img-1', {
      originalname: 'test-image.zip',
      size: 1234,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upload() rejects when state is not awaiting_upload', async () => {
    const storedFile = makeStoredFile({ status: 'ready', extension: 'tar', sizeBytes: '1' });
    const image = makeImage({ storedFile });
    componentRepoMock.findOne.mockResolvedValue(makeComponent());
    imageRepoMock.findOne.mockResolvedValue(image);

    await expect(service.upload('proj-1', 'comp-1', 'img-1', {
      originalname: 'test-image.tar',
      size: 1234,
    })).rejects.toBeInstanceOf(ConflictException);
  });
});
