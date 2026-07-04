import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { CveResearchDocumentsController } from '../../../../src/server/components/cve_research_documents/cve_research_documents.controller.js';
import { CveResearchDocumentsService } from '../../../../src/server/components/cve_research_documents/cve_research_documents.service.js';
import type { CveResearchDocument } from '../../../../src/db/entities/cve_research_documents/definition.js';
import type { Cve } from '../../../../src/db/entities/cves/definition.js';

describe('CveResearchDocumentsController', () => {
  let controller: CveResearchDocumentsController;

  const makeCve = (): Cve =>
    ({
      cveId: 'CVE-2021-44228',
      severity: 'UNKNOWN',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 0n,
      intelUpdatedAtUnixSeconds: 0n,
      researchSummary: '',
    }) as Cve;

  const makeDoc = (overrides: Partial<CveResearchDocument> = {}): CveResearchDocument =>
    ({
      id: 'doc-1',
      cve: makeCve(),
      source: 'user_upload',
      title: 't',
      content: 'c',
      createdAtUnixSeconds: 3n,
      ...overrides,
    }) as CveResearchDocument;

  type ServiceMock = Pick<
    jest.Mocked<CveResearchDocumentsService>,
    'list' | 'getById' | 'create' | 'update' | 'delete'
  >;
  const serviceMock: ServiceMock = {
    list: jest.fn<CveResearchDocumentsService['list']>(),
    getById: jest.fn<CveResearchDocumentsService['getById']>(),
    create: jest.fn<CveResearchDocumentsService['create']>(),
    update: jest.fn<CveResearchDocumentsService['update']>(),
    delete: jest.fn<CveResearchDocumentsService['delete']>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CveResearchDocumentsController],
      providers: [{ provide: CveResearchDocumentsService, useValue: serviceMock }],
    }).compile();

    controller = module.get<CveResearchDocumentsController>(CveResearchDocumentsController);
    jest.clearAllMocks();
  });

  it('list() maps to DTOs', async () => {
    serviceMock.list.mockResolvedValue([makeDoc()]);

    await expect(controller.list('CVE-2021-44228')).resolves.toEqual([
      {
        id: 'doc-1',
        cveId: 'CVE-2021-44228',
        source: 'user_upload',
        title: 't',
        content: 'c',
        createdAtUnixSeconds: '3',
      },
    ]);
    expect(serviceMock.list).toHaveBeenCalledWith('CVE-2021-44228');
  });

  it('getById() maps to DTO', async () => {
    serviceMock.getById.mockResolvedValue(makeDoc());

    await expect(controller.getById('CVE-2021-44228', 'doc-1')).resolves.toEqual({
      id: 'doc-1',
      cveId: 'CVE-2021-44228',
      source: 'user_upload',
      title: 't',
      content: 'c',
      createdAtUnixSeconds: '3',
    });
  });

  it('create() delegates to service', async () => {
    const dto = { title: 't', content: 'c' };
    serviceMock.create.mockResolvedValue(makeDoc());

    await controller.create('CVE-2021-44228', dto);
    expect(serviceMock.create).toHaveBeenCalledWith('CVE-2021-44228', dto);
  });

  it('update() delegates to service', async () => {
    const dto = { title: 'new' };
    serviceMock.update.mockResolvedValue(makeDoc({ title: 'new' }));

    await controller.update('CVE-2021-44228', 'doc-1', dto);
    expect(serviceMock.update).toHaveBeenCalledWith('CVE-2021-44228', 'doc-1', dto);
  });

  it('delete() delegates to service', async () => {
    serviceMock.delete.mockResolvedValue(undefined);

    await controller.delete('CVE-2021-44228', 'doc-1');
    expect(serviceMock.delete).toHaveBeenCalledWith('CVE-2021-44228', 'doc-1');
  });

  it('getById() propagates NotFoundException', async () => {
    const err = new NotFoundException('nope');
    serviceMock.getById.mockRejectedValue(err);

    await expect(controller.getById('CVE-2021-44228', 'x')).rejects.toBe(err);
  });
});
