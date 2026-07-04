import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest, afterEach } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

import { CvesService } from '../../../../src/server/components/cves/cves.service.js';
import { DATA_SOURCE } from '../../../../src/server/database/database.constants.js';
import { APP_CONFIGURATION } from '../../../../src/server/configuration/configuration.constants.js';
import { Cve } from '../../../../src/db/entities/cves/definition.js';
import * as CveIntelRefresh from '../../../../src/cveIntelRefresh/definition.js';

describe('CvesService', () => {
  let service: CvesService;

  type CveRepoSubset = {
    find: Repository<Cve>['find'];
    findOne: Repository<Cve>['findOne'];
    create: (partial: Partial<Cve>) => Cve;
    save: (entity: Cve) => Promise<Cve>;
  };

  const cveRepoMock: jest.Mocked<CveRepoSubset> = {
    find: jest.fn<CveRepoSubset['find']>(),
    findOne: jest.fn<CveRepoSubset['findOne']>(),
    create: jest.fn<CveRepoSubset['create']>(),
    save: jest.fn<CveRepoSubset['save']>(),
  };

  const dataSourceMock = {
    getRepository: jest.fn<(entity: unknown) => Repository<Cve>>(),
  };

  const configuration = {
    db: {},
    fs: { path: ['x'] },
    server: { port: 3000 },
    workers: {
      storedFileUploadTimeout: { state: 'disabled' as const },
      cisaKevFetch: { state: 'disabled' as const },
    },
    secrets: { nvdApiKey: null },
  };

  const makeCve = (overrides: Partial<Cve> = {}): Cve =>
    ({
      cveId: 'CVE-2021-44228',
      severity: 'UNKNOWN',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 0n,
      intelUpdatedAtUnixSeconds: 0n,
      researchSummary: '',
      ...overrides,
    }) as Cve;

  beforeEach(async () => {
    dataSourceMock.getRepository.mockReturnValue(cveRepoMock as unknown as Repository<Cve>);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvesService,
        { provide: DATA_SOURCE, useValue: dataSourceMock as unknown as DataSource },
        { provide: APP_CONFIGURATION, useValue: configuration },
      ],
    }).compile();

    service = module.get<CvesService>(CvesService);
    jest.clearAllMocks();
    jest.spyOn(CveIntelRefresh, 'refreshCveIntel').mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('list() delegates to repository', async () => {
    const rows = [makeCve()];
    cveRepoMock.find.mockResolvedValue(rows);

    await expect(service.list(5, 10)).resolves.toEqual(rows);
    expect(cveRepoMock.find).toHaveBeenCalledWith({
      order: { cveId: 'ASC' },
      skip: 5,
      take: 10,
    });
  });

  it('getById() throws BadRequestException for invalid id', async () => {
    await expect(service.getById('not-a-cve')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('getById() returns CVE when found', async () => {
    const row = makeCve();
    cveRepoMock.findOne.mockResolvedValue(row);

    await expect(service.getById('CVE-2021-44228')).resolves.toEqual(row);
    expect(cveRepoMock.findOne).toHaveBeenCalledWith({ where: { cveId: 'CVE-2021-44228' } });
  });

  it('getById() throws NotFoundException when missing', async () => {
    cveRepoMock.findOne.mockResolvedValue(null);

    await expect(service.getById('CVE-2021-44228')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create() throws ConflictException when CVE exists', async () => {
    cveRepoMock.findOne.mockResolvedValue(makeCve());

    await expect(service.create({ cveId: 'CVE-2021-44228' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('create() saves new CVE', async () => {
    cveRepoMock.findOne.mockResolvedValue(null);
    const created = makeCve();
    cveRepoMock.create.mockReturnValue(created);
    cveRepoMock.save.mockResolvedValue(created);

    const result = await service.create({ cveId: 'CVE-2021-44228' });

    expect(cveRepoMock.create).toHaveBeenCalled();
    expect(cveRepoMock.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });

  it('refreshIntel() throws NotFound when refresh reports missing CVE', async () => {
    jest.spyOn(CveIntelRefresh, 'refreshCveIntel').mockResolvedValue({
      ok: false,
      reason: 'cve_not_found',
    });

    await expect(service.refreshIntel('CVE-2021-44228')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refreshIntel() calls refreshCveIntel and returns updated row', async () => {
    const updated = makeCve({ severity: 'HIGH' });
    cveRepoMock.findOne.mockResolvedValue(updated);

    const result = await service.refreshIntel('CVE-2021-44228');

    expect(CveIntelRefresh.refreshCveIntel).toHaveBeenCalled();
    expect(result).toEqual(updated);
  });

  it('updateResearchSummary() updates and saves row', async () => {
    const row = makeCve({ researchSummary: '' });
    cveRepoMock.findOne.mockResolvedValue(row);
    cveRepoMock.save.mockResolvedValue(row);

    const result = await service.updateResearchSummary('CVE-2021-44228', 'manual summary');

    expect(row.researchSummary).toBe('manual summary');
    expect(cveRepoMock.save).toHaveBeenCalledWith(row);
    expect(result).toEqual(row);
  });

  it('updateResearchSummary() throws NotFoundException when CVE is missing', async () => {
    cveRepoMock.findOne.mockResolvedValue(null);
    await expect(service.updateResearchSummary('CVE-2021-44228', 'manual summary')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
