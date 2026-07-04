import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

import { ProjectsService } from '../../../src/server/projects/projects.service.js';
import { DATA_SOURCE } from '../../../src/server/database/database.constants.js';
import { Project } from '../../../src/db/entities/projects/definition.js';
import { Component } from '../../../src/db/entities/components/definition.js';
import { ContainerImage } from '../../../src/db/entities/container_images/definition.js';
import { ImageCve } from '../../../src/db/entities/image_cve/definition.js';

describe('ProjectsService', () => {
  let service: ProjectsService;

  type DataSourceSubset = {
    getRepository: (target: unknown) => Repository<Project>;
  };
  

  type RepoSubset = {
    find: Repository<Project>['find'];
    findOneBy: Repository<Project>['findOneBy'];
    create: (entityLike: Partial<Project>) => Project;
    save: (entity: Project) => Promise<Project>;
  };
  const repoMock: jest.Mocked<RepoSubset> = {
    find: jest.fn<RepoSubset['find']>(),
    findOneBy: jest.fn<RepoSubset['findOneBy']>(),
    create: jest.fn<RepoSubset['create']>(),
    save: jest.fn<RepoSubset['save']>(),
  };

  const componentRepoMock: jest.Mocked<{ find: Repository<Component>['find'] }> = {
    find: jest.fn<Repository<Component>['find']>(),
  };
  const containerImageRepoMock: jest.Mocked<{ findOne: Repository<ContainerImage>['findOne'] }> = {
    findOne: jest.fn<Repository<ContainerImage>['findOne']>(),
  };
  const imageCveRepoMock: jest.Mocked<{ find: Repository<ImageCve>['find'] }> = {
    find: jest.fn<Repository<ImageCve>['find']>(),
  };

  const dataSourceMock: {
    getRepository: jest.Mock;
  } = {
    getRepository: jest.fn(),
  };

  const makeProject = (overrides: Partial<Project> = {}): Project => ({
    id: '1',
    name: 'proj',
    description: 'desc',
    createdAtUnixSeconds: 1n,
    updatedAtUnixSeconds: 1n,
    ...overrides,
  });

  beforeEach(async () => {
    dataSourceMock.getRepository.mockImplementation((target: unknown) => {
      if (target === Project) return repoMock as unknown as Repository<Project>;
      if (target === Component) return componentRepoMock as unknown as Repository<Component>;
      if (target === ContainerImage) return containerImageRepoMock as unknown as Repository<ContainerImage>;
      if (target === ImageCve) return imageCveRepoMock as unknown as Repository<ImageCve>;
      throw new Error('Unexpected repository target');
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: DATA_SOURCE, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('list() returns all projects', async () => {
    const rows: Project[] = [makeProject()];
    repoMock.find.mockResolvedValue(rows);

    await expect(service.list()).resolves.toEqual(rows);
    expect(repoMock.find).toHaveBeenCalledTimes(1);
  });

  it('getById() returns project when found', async () => {
    const row = makeProject();
    repoMock.findOneBy.mockResolvedValue(row);

    await expect(service.getById('1')).resolves.toEqual(row);
    expect(repoMock.findOneBy).toHaveBeenCalledWith({ id: '1' });
  });

  it('getById() throws NotFoundException when missing', async () => {
    repoMock.findOneBy.mockResolvedValue(null);

    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create() creates and saves project', async () => {
    const dto = { name: 'proj', description: 'desc' };
    const created = makeProject({ name: dto.name, description: dto.description });

    repoMock.create.mockReturnValue(created);
    repoMock.save.mockResolvedValue(created);

    const result = await service.create(dto);

    expect(repoMock.create).toHaveBeenCalledTimes(1);
    expect(repoMock.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });

  it('update() updates description and saves project', async () => {
    const existing = makeProject({ description: 'old' });

    repoMock.findOneBy.mockResolvedValue(existing);
    repoMock.save.mockImplementation(async (entity) => entity as Project);

    const updated = await service.update('1', { description: 'new' });

    expect(existing.description).toBe('new');
    expect(typeof existing.updatedAtUnixSeconds).toBe('bigint');
    expect(repoMock.save).toHaveBeenCalledWith(existing);
    expect(updated.description).toBe('new');
  });

  it('getStats() returns zero matrix when project has no components', async () => {
    const project = makeProject({ id: '1' });
    repoMock.findOneBy.mockResolvedValue(project);
    componentRepoMock.find.mockResolvedValue([]);

    const stats = await service.getStats('1');

    expect(stats).toEqual({
      scope: { enabledOnly: true, latestImageOnlyPerComponent: true },
      totals: { enabledImageCves: 0 },
      byVexStatus: {
        under_investigation: {
          total: 0,
          severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        },
        not_affected: {
          total: 0,
          severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        },
        affected: {
          total: 0,
          severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        },
      },
    });
  });

  it('getStats() aggregates latest-image enabled rows over all components', async () => {
    const project = makeProject({ id: '1' });
    repoMock.findOneBy.mockResolvedValue(project);
    componentRepoMock.find.mockResolvedValue([
      { id: 'c1' } as Component,
      { id: 'c2' } as Component,
    ]);
    containerImageRepoMock.findOne.mockResolvedValueOnce({
      id: 'img-c1',
      chainIndex: 3,
    } as ContainerImage);
    containerImageRepoMock.findOne.mockResolvedValueOnce({
      id: 'img-c2',
      chainIndex: 5,
    } as ContainerImage);
    imageCveRepoMock.find.mockResolvedValueOnce([
      {
        id: 'icve-1',
        cve: { cveId: 'CVE-1', severity: 'HIGH' },
        isDisabled: false,
        storedInternalStatement: { status: 'under_investigation', context: { type: 'fresh' } },
        expiryTimeUnixSeconds: null,
        decisionRecordedAtUnixSeconds: 1n,
      } as unknown as ImageCve,
    ]);
    imageCveRepoMock.find.mockResolvedValueOnce([
      {
        id: 'icve-2',
        cve: { cveId: 'CVE-2', severity: 'CRITICAL' },
        isDisabled: false,
        storedInternalStatement: { status: 'affected', action_statement: '', status_notes: '' },
        expiryTimeUnixSeconds: 1n,
        decisionRecordedAtUnixSeconds: 1n,
      } as unknown as ImageCve,
      {
        id: 'icve-3',
        cve: { cveId: 'CVE-3', severity: 'LOW' },
        isDisabled: false,
        storedInternalStatement: {
          status: 'not_affected',
          justification: 'component_not_present',
          impact_statement: '',
          status_notes: '',
        },
        expiryTimeUnixSeconds: 9999999999n,
        decisionRecordedAtUnixSeconds: 1n,
      } as unknown as ImageCve,
    ]);

    const stats = await service.getStats('1');

    expect(containerImageRepoMock.findOne).toHaveBeenCalledTimes(2);
    expect(imageCveRepoMock.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { containerImage: { id: 'img-c1' }, isDisabled: false } }),
    );
    expect(imageCveRepoMock.find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { containerImage: { id: 'img-c2' }, isDisabled: false } }),
    );
    expect(stats.totals.enabledImageCves).toBe(3);
    expect(stats.byVexStatus.under_investigation.total).toBe(2);
    expect(stats.byVexStatus.under_investigation.severity.HIGH).toBe(1);
    expect(stats.byVexStatus.under_investigation.severity.CRITICAL).toBe(1);
    expect(stats.byVexStatus.not_affected.total).toBe(1);
    expect(stats.byVexStatus.not_affected.severity.LOW).toBe(1);
  });
});