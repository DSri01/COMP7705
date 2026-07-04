import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { ComponentsController } from '../../../src/server/components/components.controller.js';
import { ComponentsService } from '../../../src/server/components/components.service.js';
import { Project } from '../../../src/db/entities/projects/definition.js';

describe('ComponentsController', () => {
  let controller: ComponentsController;

  const makeProject = (overrides: Partial<Project> = {}): Project => ({
    id: 'p1',
    name: 'project',
    description: 'project desc',
    createdAtUnixSeconds: 1n,
    updatedAtUnixSeconds: 1n,
    ...overrides,
  });

  type ComponentsServiceMock = Pick<
    jest.Mocked<ComponentsService>,
    'list' | 'getById' | 'create' | 'update' | 'exportVex' | 'triggerScan' | 'getStats'
  >;
  const componentsServiceMock: ComponentsServiceMock = {
    list: jest.fn<ComponentsService['list']>(),
    getById: jest.fn<ComponentsService['getById']>(),
    create: jest.fn<ComponentsService['create']>(),
    update: jest.fn<ComponentsService['update']>(),
    exportVex: jest.fn<ComponentsService['exportVex']>(),
    triggerScan: jest.fn<ComponentsService['triggerScan']>(),
    getStats: jest.fn<ComponentsService['getStats']>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComponentsController],
      providers: [{ provide: ComponentsService, useValue: componentsServiceMock }],
    }).compile();

    controller = module.get<ComponentsController>(ComponentsController);
    jest.clearAllMocks();
  });

  it('list() delegates to service', async () => {
    const serviceRows = [
      {
        id: '1',
        name: 'authService',
        description: 'desc',
        project: makeProject({ id: 'p1' }),
        createdAtUnixSeconds: 1n,
        updatedAtUnixSeconds: 1n,
      },
    ];
    const expectedDto = [
      {
        id: '1',
        projectId: 'p1',
        name: 'authService',
        description: 'desc',
        createdAtUnixSeconds: '1',
        updatedAtUnixSeconds: '1',
      },
    ];
    componentsServiceMock.list.mockResolvedValue(serviceRows);

    await expect(controller.list('p1')).resolves.toEqual(expectedDto);
    expect(componentsServiceMock.list).toHaveBeenCalledWith('p1');
  });

  it('getById() delegates to service', async () => {
    const serviceRow = {
      id: '1',
      name: 'authService',
      description: 'desc',
      project: makeProject({ id: 'p1' }),
      createdAtUnixSeconds: 1n,
      updatedAtUnixSeconds: 1n,
    };
    const expectedDto = {
      id: '1',
      projectId: 'p1',
      name: 'authService',
      description: 'desc',
      createdAtUnixSeconds: '1',
      updatedAtUnixSeconds: '1',
    };
    componentsServiceMock.getById.mockResolvedValue(serviceRow);

    await expect(controller.getById('p1', '1')).resolves.toEqual(expectedDto);
    expect(componentsServiceMock.getById).toHaveBeenCalledWith('p1', '1');
  });

  it('create() delegates to service', async () => {
    const dto = { name: 'authService', description: 'desc' };
    componentsServiceMock.create.mockResolvedValue({
      id: '1',
      project: makeProject({ id: 'p1' }),
      createdAtUnixSeconds: 1n,
      updatedAtUnixSeconds: 1n,
      ...dto,
    });

    await controller.create('p1', dto);
    expect(componentsServiceMock.create).toHaveBeenCalledWith('p1', dto);
  });

  it('update() delegates to service', async () => {
    const dto = { description: 'new' };
    componentsServiceMock.update.mockResolvedValue({
      id: '1',
      name: 'authService',
      project: makeProject({ id: 'p1' }),
      createdAtUnixSeconds: 1n,
      updatedAtUnixSeconds: 1n,
      ...dto,
    });

    await controller.update('p1', '1', dto);
    expect(componentsServiceMock.update).toHaveBeenCalledWith('p1', '1', dto);
  });

  it('exportVex() delegates to service', async () => {
    const doc = { '@context': 'https://openvex.dev/ns/v0.2.0', statements: [] };
    componentsServiceMock.exportVex.mockResolvedValue(doc);

    await expect(controller.exportVex('p1', '1')).resolves.toEqual(doc);
    expect(componentsServiceMock.exportVex).toHaveBeenCalledWith('p1', '1');
  });

  it('triggerScan() delegates to service', async () => {
    componentsServiceMock.triggerScan.mockResolvedValue({ status: 'ok' });
    await expect(controller.triggerScan('p1', '1')).resolves.toEqual({ status: 'ok' });
    expect(componentsServiceMock.triggerScan).toHaveBeenCalledWith('p1', '1');
  });

  it('getStats() delegates to service', async () => {
    const stats = {
      scope: { enabledOnly: true as const, latestImageOnlyPerComponent: true as const },
      totals: { enabledImageCves: 2 },
      byVexStatus: {
        under_investigation: {
          total: 1,
          severity: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        },
        not_affected: {
          total: 1,
          severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 1, LOW: 0, UNKNOWN: 0 },
        },
        affected: {
          total: 0,
          severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        },
      },
    };
    componentsServiceMock.getStats.mockResolvedValue(stats);

    await expect(controller.getStats('p1', '1')).resolves.toEqual(stats);
    expect(componentsServiceMock.getStats).toHaveBeenCalledWith('p1', '1');
  });

  it('getById() propagates NotFoundException from service', async () => {
    const err = new NotFoundException('Component missing');
    componentsServiceMock.getById.mockRejectedValue(err);

    await expect(controller.getById('p1', 'missing-id')).rejects.toBe(err);
    expect(componentsServiceMock.getById).toHaveBeenCalledWith('p1', 'missing-id');
  });
});
