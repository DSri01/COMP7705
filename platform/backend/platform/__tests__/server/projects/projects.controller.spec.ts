import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { ProjectsController } from '../../../src/server/projects/projects.controller.js';
import { ProjectsService } from '../../../src/server/projects/projects.service.js';
import { NotFoundException } from '@nestjs/common';

describe('ProjectsController', () => {
    let controller: ProjectsController;

    type ProjectsServiceMock = Pick<
    jest.Mocked<ProjectsService>,
    'list' | 'getById' | 'create' | 'update' | 'getStats'
    >;
    const projectsServiceMock: ProjectsServiceMock = {
    list: jest.fn<ProjectsService['list']>(),
    getById: jest.fn<ProjectsService['getById']>(),
    create: jest.fn<ProjectsService['create']>(),
    update: jest.fn<ProjectsService['update']>(),
    getStats: jest.fn<ProjectsService['getStats']>(),
    };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: projectsServiceMock }],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    jest.clearAllMocks();
  });

  it('list() delegates to service', async () => {
    const serviceRows = [
        {
          id: '1',
          name: 'p1',
          description: 'desc',
          createdAtUnixSeconds: 1n,
          updatedAtUnixSeconds: 1n,
        },
      ];
      const expectedDto = [
        {
          id: '1',
          name: 'p1',
          description: 'desc',
          createdAtUnixSeconds: '1',
          updatedAtUnixSeconds: '1',
        },
      ];
    projectsServiceMock.list.mockResolvedValue(serviceRows);

    await expect(controller.list()).resolves.toEqual(expectedDto);
    expect(projectsServiceMock.list).toHaveBeenCalledTimes(1);
  });

  it('getById() delegates to service', async () => {

    const serviceRow = {
      id: '1',
      name: 'p1',
      description: 'desc',
      createdAtUnixSeconds: 1n,
      updatedAtUnixSeconds: 1n,
    };
    const expectedDto = {
      id: '1',
      name: 'p1',
      description: 'desc',
      createdAtUnixSeconds: '1',
      updatedAtUnixSeconds: '1',
    };
    projectsServiceMock.getById.mockResolvedValue(serviceRow);

    await expect(controller.getById('1')).resolves.toEqual(expectedDto);
    expect(projectsServiceMock.getById).toHaveBeenCalledWith('1');
  });

  it('create() delegates to service', async () => {
    const dto = { name: 'proj', description: 'desc' };
    const serviceRow = { id: '1', createdAtUnixSeconds: 1n, updatedAtUnixSeconds: 1n, ...dto };
    projectsServiceMock.create.mockResolvedValue(serviceRow);

    await controller.create(dto);
    expect(projectsServiceMock.create).toHaveBeenCalledWith(dto);
  });

  it('update() delegates to service', async () => {
    const dto = { description: 'new' };
    projectsServiceMock.update.mockResolvedValue({ id: '1', name: 'proj', createdAtUnixSeconds: 1n, updatedAtUnixSeconds: 1n, ...dto });

    await controller.update('1', dto);
    expect(projectsServiceMock.update).toHaveBeenCalledWith('1', dto);
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
    projectsServiceMock.getStats.mockResolvedValue(stats);

    await expect(controller.getStats('1')).resolves.toEqual(stats);
    expect(projectsServiceMock.getStats).toHaveBeenCalledWith('1');
  });

  it('getById() propagates NotFoundException from service', async () => {
    const err = new NotFoundException('Project missing');
    projectsServiceMock.getById.mockRejectedValue(err);
    await expect(controller.getById('missing-id')).rejects.toBe(err);
    expect(projectsServiceMock.getById).toHaveBeenCalledWith('missing-id');
  });
});