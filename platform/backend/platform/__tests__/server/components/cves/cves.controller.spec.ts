import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { CvesController } from '../../../../src/server/components/cves/cves.controller.js';
import { CvesService } from '../../../../src/server/components/cves/cves.service.js';
import type { Cve } from '../../../../src/db/entities/cves/definition.js';

describe('CvesController', () => {
  let controller: CvesController;

  const makeCve = (overrides: Partial<Cve> = {}): Cve =>
    ({
      cveId: 'CVE-2021-44228',
      severity: 'HIGH',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 1n,
      intelUpdatedAtUnixSeconds: 2n,
      researchSummary: '',
      ...overrides,
    }) as Cve;

  type CvesServiceMock = Pick<
    jest.Mocked<CvesService>,
    'list' | 'getById' | 'create' | 'refreshIntel' | 'updateResearchSummary'
  >;
  const cvesServiceMock: CvesServiceMock = {
    list: jest.fn<CvesService['list']>(),
    getById: jest.fn<CvesService['getById']>(),
    create: jest.fn<CvesService['create']>(),
    refreshIntel: jest.fn<CvesService['refreshIntel']>(),
    updateResearchSummary: jest.fn<CvesService['updateResearchSummary']>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CvesController],
      providers: [{ provide: CvesService, useValue: cvesServiceMock }],
    }).compile();

    controller = module.get<CvesController>(CvesController);
    jest.clearAllMocks();
  });

  it('list() maps entities to DTOs', async () => {
    const rows = [makeCve()];
    cvesServiceMock.list.mockResolvedValue(rows);

    await expect(controller.list(0, 50)).resolves.toEqual([
      {
        cveId: 'CVE-2021-44228',
        severity: 'HIGH',
        intelHighlights: null,
        intelLastAttemptAtUnixSeconds: '1',
        intelUpdatedAtUnixSeconds: '2',
        researchSummary: '',
      },
    ]);
    expect(cvesServiceMock.list).toHaveBeenCalledWith(0, 50);
  });

  it('list() clamps limit to 200', async () => {
    cvesServiceMock.list.mockResolvedValue([]);
    await controller.list(0, 9999);
    expect(cvesServiceMock.list).toHaveBeenCalledWith(0, 200);
  });

  it('getById() maps entity to DTO', async () => {
    const row = makeCve();
    cvesServiceMock.getById.mockResolvedValue(row);

    await expect(controller.getById('CVE-2021-44228')).resolves.toEqual({
      cveId: 'CVE-2021-44228',
      severity: 'HIGH',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: '1',
      intelUpdatedAtUnixSeconds: '2',
      researchSummary: '',
    });
    expect(cvesServiceMock.getById).toHaveBeenCalledWith('CVE-2021-44228');
  });

  it('create() delegates to service', async () => {
    const dto = { cveId: 'CVE-2021-44228' };
    cvesServiceMock.create.mockResolvedValue(makeCve());

    await controller.create(dto);
    expect(cvesServiceMock.create).toHaveBeenCalledWith(dto);
  });

  it('refreshIntel() delegates to service', async () => {
    cvesServiceMock.refreshIntel.mockResolvedValue(makeCve());

    await controller.refreshIntel('CVE-2021-44228');
    expect(cvesServiceMock.refreshIntel).toHaveBeenCalledWith('CVE-2021-44228');
  });

  it('updateResearchSummary() delegates to service', async () => {
    cvesServiceMock.updateResearchSummary.mockResolvedValue(
      makeCve({ researchSummary: 'manual summary' }),
    );

    await controller.updateResearchSummary('CVE-2021-44228', { researchSummary: 'manual summary' });
    expect(cvesServiceMock.updateResearchSummary).toHaveBeenCalledWith(
      'CVE-2021-44228',
      'manual summary',
    );
  });

  it('getById() propagates NotFoundException', async () => {
    const err = new NotFoundException('missing');
    cvesServiceMock.getById.mockRejectedValue(err);

    await expect(controller.getById('CVE-1999-0001')).rejects.toBe(err);
  });
});
