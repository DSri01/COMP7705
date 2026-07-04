import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

import { ComponentsService } from '../../../src/server/components/components.service.js';
import { DATA_SOURCE } from '../../../src/server/database/database.constants.js';
import { APP_CONFIGURATION } from '../../../src/server/configuration/configuration.constants.js';
import { Component } from '../../../src/db/entities/components/definition.js';
import { Project } from '../../../src/db/entities/projects/definition.js';
import { ContainerImage } from '../../../src/db/entities/container_images/definition.js';
import { ImageCve } from '../../../src/db/entities/image_cve/definition.js';
import { runContainerRescanForImage } from '../../../src/containerRescan/definition.js';

jest.mock('../../../src/containerRescan/definition.js', () => ({
  runContainerRescanForImage: jest.fn(),
}));

const runContainerRescanForImageMock = jest.mocked(runContainerRescanForImage);

describe('ComponentsService', () => {
  let service: ComponentsService;

  type ComponentRepoSubset = {
    find: Repository<Component>['find'];
    findOne: Repository<Component>['findOne'];
    create: (entityLike: Partial<Component>) => Component;
    save: (entity: Component) => Promise<Component>;
  };

  type ProjectRepoSubset = {
    findOneBy: Repository<Project>['findOneBy'];
  };

  const componentRepoMock: jest.Mocked<ComponentRepoSubset> = {
    find: jest.fn<ComponentRepoSubset['find']>(),
    findOne: jest.fn<ComponentRepoSubset['findOne']>(),
    create: jest.fn<ComponentRepoSubset['create']>(),
    save: jest.fn<ComponentRepoSubset['save']>(),
  };

  const projectRepoMock: jest.Mocked<ProjectRepoSubset> = {
    findOneBy: jest.fn<ProjectRepoSubset['findOneBy']>(),
  };

  const dataSourceMock: {
    getRepository: jest.Mock;
    transaction: jest.Mock;
  } = {
    getRepository: jest.fn(),
    transaction: jest.fn(),
  };

  const makeProject = (overrides: Partial<Project> = {}): Project => ({
    id: 'p1',
    name: 'proj',
    description: 'desc',
    createdAtUnixSeconds: 1n,
    updatedAtUnixSeconds: 1n,
    ...overrides,
  });

  const makeComponent = (overrides: Partial<Component> = {}): Component => ({
    id: 'c1',
    name: 'authService',
    description: 'component desc',
    project: makeProject(),
    createdAtUnixSeconds: 1n,
    updatedAtUnixSeconds: 1n,
    ...overrides,
  });

  const containerImageRepoMock: jest.Mocked<{
    findOne: Repository<ContainerImage>['findOne'];
    save: (row: ContainerImage) => Promise<ContainerImage>;
  }> = {
    findOne: jest.fn<Repository<ContainerImage>['findOne']>(),
    save: jest.fn(async (row: ContainerImage) => row),
  };

  const imageCveRepoMock: jest.Mocked<{
    find: Repository<ImageCve>['find'];
  }> = {
    find: jest.fn<Repository<ImageCve>['find']>(),
  };

  beforeEach(async () => {
    dataSourceMock.getRepository.mockImplementation((target: unknown) => {
      if (target === Component) return componentRepoMock as unknown as Repository<Component>;
      if (target === Project) return projectRepoMock as unknown as Repository<Project>;
      if (target === ContainerImage) return containerImageRepoMock as unknown as Repository<ContainerImage>;
      if (target === ImageCve) return imageCveRepoMock as unknown as Repository<ImageCve>;
      throw new Error('Unexpected repository target');
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComponentsService,
        { provide: DATA_SOURCE, useValue: dataSourceMock as unknown as DataSource },
        {
          provide: APP_CONFIGURATION,
          useValue: {
            containerScanner: { url: 'http://scanner:8080/container/tar/json/scan' },
          },
        },
      ],
    }).compile();

    service = module.get<ComponentsService>(ComponentsService);
    jest.clearAllMocks();
    dataSourceMock.transaction.mockReset();
    runContainerRescanForImageMock.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('list() returns components in a project', async () => {
    const project = makeProject();
    const rows: Component[] = [makeComponent({ project })];

    projectRepoMock.findOneBy.mockResolvedValue(project);
    componentRepoMock.find.mockResolvedValue(rows);

    await expect(service.list('p1')).resolves.toEqual(rows);
    expect(componentRepoMock.find).toHaveBeenCalledWith(expect.objectContaining({
      where: { project: { id: 'p1' } },
      relations: expect.objectContaining({ project: true }),
    }));
  });

  it('getById() returns component when found', async () => {
    const project = makeProject();
    const row = makeComponent({ id: 'c1', project });

    projectRepoMock.findOneBy.mockResolvedValue(project);
    componentRepoMock.findOne.mockResolvedValue(row);

    await expect(service.getById('p1', 'c1')).resolves.toEqual(row);
    expect(componentRepoMock.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'c1', project: { id: 'p1' } },
      relations: expect.objectContaining({ project: true }),
    }));
  });

  it('getById() throws NotFoundException when component missing', async () => {
    projectRepoMock.findOneBy.mockResolvedValue(makeProject());
    componentRepoMock.findOne.mockResolvedValue(null);

    await expect(service.getById('p1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('list() throws NotFoundException when project missing', async () => {
    projectRepoMock.findOneBy.mockResolvedValue(null);

    await expect(service.list('missing-project')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create() creates and saves component', async () => {
    const dto = { name: 'authService', description: 'component desc' };
    const project = makeProject();
    const created = makeComponent({ name: dto.name, description: dto.description, project });

    projectRepoMock.findOneBy.mockResolvedValue(project);
    componentRepoMock.create.mockReturnValue(created);
    componentRepoMock.save.mockResolvedValue(created);

    const result = await service.create('p1', dto);

    expect(componentRepoMock.create).toHaveBeenCalledTimes(1);
    expect(componentRepoMock.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });

  it('update() updates description and saves component', async () => {
    const project = makeProject();
    const existing = makeComponent({ description: 'old', project });

    projectRepoMock.findOneBy.mockResolvedValue(project);
    componentRepoMock.findOne.mockResolvedValue(existing);
    componentRepoMock.save.mockImplementation(async (entity) => entity as Component);

    const updated = await service.update('p1', 'c1', { description: 'new' });

    expect(existing.description).toBe('new');
    expect(typeof existing.updatedAtUnixSeconds).toBe('bigint');
    expect(componentRepoMock.save).toHaveBeenCalledWith(existing);
    expect(updated.description).toBe('new');
  });

  it('exportVex() throws when component has no images', async () => {
    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (manager: unknown) => Promise<unknown>;
      const manager = {
        getRepository: (target: unknown) => {
          if (target === Component) {
            return { findOne: async () => makeComponent() };
          }
          if (target === ContainerImage) {
            return { findOne: async () => null };
          }
          if (target === ImageCve) {
            return { find: async () => [] };
          }
          throw new Error('Unexpected repository target');
        },
      };
      return fn(manager);
    });

    await expect(service.exportVex('p1', 'c1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exportVex() returns OpenVEX doc and skips disabled rows', async () => {
    const image = {
      id: 'img-1',
      chainIndex: 2,
      createdAtUnixSeconds: 10n,
    } as ContainerImage;
    const rowIncluded = {
      id: 'icve-1',
      cve: { cveId: 'CVE-2021-44228' },
      isDisabled: false,
      storedInternalStatement: {
        vulnerability: { name: 'CVE-2021-44228' },
        products: [],
        status: 'under_investigation',
        context: { type: 'fresh' },
      },
      expiryTimeUnixSeconds: null,
      decisionRecordedAtUnixSeconds: 20n,
    } as unknown as ImageCve;
    const rowDisabled = {
      ...rowIncluded,
      id: 'icve-2',
      isDisabled: true,
    } as ImageCve;

    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (manager: unknown) => Promise<unknown>;
      const manager = {
        getRepository: (target: unknown) => {
          if (target === Component) {
            return { findOne: async () => makeComponent() };
          }
          if (target === ContainerImage) {
            return { findOne: async () => image };
          }
          if (target === ImageCve) {
            return { find: async () => [rowIncluded, rowDisabled] };
          }
          throw new Error('Unexpected repository target');
        },
      };
      return fn(manager);
    });

    const doc = await service.exportVex('p1', 'c1');
    expect(doc).toHaveProperty('@context', 'https://openvex.dev/ns/v0.2.0');
    expect(doc).toHaveProperty('author', 'comp7705platform');
    expect(doc).toHaveProperty('version', 1);
    expect(Array.isArray(doc.statements)).toBe(true);
    expect((doc.statements as unknown[])).toHaveLength(1);
    const statement = (doc.statements as Array<Record<string, unknown>>)[0];
    expect(statement.products).toEqual([{ '@id': 'https://comp7705platform/p1/c1/img-1' }]);
    expect(statement.vulnerability).toEqual({ name: 'CVE-2021-44228' });
  });

  it('triggerScan() returns container_not_uploaded and updates image scan code when tar not ready', async () => {
    const project = makeProject();
    const component = makeComponent({ id: 'c1', project });
    const image = {
      id: 'img-1',
      component,
      chainIndex: 2,
      storedFile: { id: 'sf-1', status: 'awaiting_upload', extension: null },
      createdAtUnixSeconds: 1n,
      uploadFinishedAtUnixSeconds: null,
      scanResultCode: 'ok',
      scanAttemptedAtUnixSeconds: 0n,
      scanFinishedAtUnixSeconds: 0n,
    } as unknown as ContainerImage;
    projectRepoMock.findOneBy.mockResolvedValue(project);
    componentRepoMock.findOne.mockResolvedValue(component);
    containerImageRepoMock.findOne.mockResolvedValue(image);

    const result = await service.triggerScan('p1', 'c1');

    expect(result).toEqual({ status: 'container_not_uploaded' });
    expect(containerImageRepoMock.save).toHaveBeenCalledTimes(1);
    expect((containerImageRepoMock.save.mock.calls[0]?.[0] as ContainerImage).scanResultCode).toBe('container_not_uploaded');
    expect(runContainerRescanForImageMock).not.toHaveBeenCalled();
  });

  it('triggerScan() returns ok and fires shared rescan path when tar is ready', async () => {
    const project = makeProject();
    const component = makeComponent({ id: 'c1', project });
    const image = {
      id: 'img-1',
      component,
      chainIndex: 2,
      storedFile: { id: 'sf-1', status: 'ready', extension: 'tar' },
      createdAtUnixSeconds: 1n,
      uploadFinishedAtUnixSeconds: 1n,
      scanResultCode: 'ok',
      scanAttemptedAtUnixSeconds: 0n,
      scanFinishedAtUnixSeconds: 0n,
    } as unknown as ContainerImage;
    projectRepoMock.findOneBy.mockResolvedValue(project);
    componentRepoMock.findOne.mockResolvedValue(component);
    containerImageRepoMock.findOne.mockResolvedValue(image);
    runContainerRescanForImageMock.mockResolvedValue({ ok: true, imageId: 'img-1', scannedCveCount: 0 });

    const result = await service.triggerScan('p1', 'c1');

    expect(result).toEqual({ status: 'ok' });
    expect(runContainerRescanForImageMock).toHaveBeenCalledTimes(1);
    expect(runContainerRescanForImageMock.mock.calls[0]?.[2]).toBe('img-1');
  });

  it('getStats() returns zero matrix when component has no images', async () => {
    const project = makeProject();
    const component = makeComponent({ id: 'c1', project });
    projectRepoMock.findOneBy.mockResolvedValue(project);
    componentRepoMock.findOne.mockResolvedValue(component);
    containerImageRepoMock.findOne.mockResolvedValue(null);

    const stats = await service.getStats('p1', 'c1');

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

  it('getStats() aggregates enabled rows by resolved vexStatus and severity', async () => {
    const project = makeProject();
    const component = makeComponent({ id: 'c1', project });
    const image = {
      id: 'img-1',
      component,
      chainIndex: 2,
      storedFile: { id: 'sf-1', status: 'ready', extension: 'tar' },
      createdAtUnixSeconds: 1n,
      uploadFinishedAtUnixSeconds: 1n,
      scanResultCode: 'ok',
      scanAttemptedAtUnixSeconds: 0n,
      scanFinishedAtUnixSeconds: 0n,
    } as unknown as ContainerImage;
    const freshUnderInvestigation = {
      id: 'icve-1',
      cve: { cveId: 'CVE-1', severity: 'HIGH' },
      isDisabled: false,
      storedInternalStatement: { status: 'under_investigation', context: { type: 'fresh' } },
      expiryTimeUnixSeconds: null,
      decisionRecordedAtUnixSeconds: 1n,
    } as unknown as ImageCve;
    const notAffected = {
      id: 'icve-2',
      cve: { cveId: 'CVE-2', severity: 'LOW' },
      isDisabled: false,
      storedInternalStatement: {
        status: 'not_affected',
        justification: 'component_not_present',
        impact_statement: '',
        status_notes: '',
      },
      expiryTimeUnixSeconds: 9999999999n,
      decisionRecordedAtUnixSeconds: 1n,
    } as unknown as ImageCve;
    const expiredAffected = {
      id: 'icve-3',
      cve: { cveId: 'CVE-3', severity: 'CRITICAL' },
      isDisabled: false,
      storedInternalStatement: {
        status: 'affected',
        action_statement: '',
        status_notes: '',
      },
      expiryTimeUnixSeconds: 1n,
      decisionRecordedAtUnixSeconds: 1n,
    } as unknown as ImageCve;

    projectRepoMock.findOneBy.mockResolvedValue(project);
    componentRepoMock.findOne.mockResolvedValue(component);
    containerImageRepoMock.findOne.mockResolvedValue(image);
    imageCveRepoMock.find.mockResolvedValue([
      freshUnderInvestigation,
      notAffected,
      expiredAffected,
    ]);

    const stats = await service.getStats('p1', 'c1');

    expect(imageCveRepoMock.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { containerImage: { id: 'img-1' }, isDisabled: false },
      }),
    );
    expect(stats.totals.enabledImageCves).toBe(3);
    expect(stats.byVexStatus.under_investigation.total).toBe(2);
    expect(stats.byVexStatus.under_investigation.severity.HIGH).toBe(1);
    expect(stats.byVexStatus.under_investigation.severity.CRITICAL).toBe(1);
    expect(stats.byVexStatus.not_affected.total).toBe(1);
    expect(stats.byVexStatus.not_affected.severity.LOW).toBe(1);
    expect(stats.byVexStatus.affected.total).toBe(0);
  });
});
