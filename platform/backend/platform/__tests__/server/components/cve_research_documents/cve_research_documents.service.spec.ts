import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';

import { CveResearchDocumentsService } from '../../../../src/server/components/cve_research_documents/cve_research_documents.service.js';
import { DATA_SOURCE } from '../../../../src/server/database/database.constants.js';
import { Cve } from '../../../../src/db/entities/cves/definition.js';
import { CveResearchDocument } from '../../../../src/db/entities/cve_research_documents/definition.js';

describe('CveResearchDocumentsService', () => {
  let service: CveResearchDocumentsService;

  type CveRepoSubset = {
    findOne: Repository<Cve>['findOne'];
  };
  type DocRepoSubset = {
    find: Repository<CveResearchDocument>['find'];
    findOne: Repository<CveResearchDocument>['findOne'];
    create: (partial: Partial<CveResearchDocument>) => CveResearchDocument;
    save: (entity: CveResearchDocument) => Promise<CveResearchDocument>;
    delete: (criteria: object) => Promise<object>;
  };

  const cveRepoMock: jest.Mocked<CveRepoSubset> = {
    findOne: jest.fn<CveRepoSubset['findOne']>(),
  };

  const docRepoMock: jest.Mocked<DocRepoSubset> = {
    find: jest.fn<DocRepoSubset['find']>(),
    findOne: jest.fn<DocRepoSubset['findOne']>(),
    create: jest.fn<DocRepoSubset['create']>(),
    save: jest.fn<DocRepoSubset['save']>(),
    delete: jest.fn<DocRepoSubset['delete']>(),
  };

  const dataSourceMock = {
    getRepository: jest.fn<(entity: unknown) => unknown>(),
  };

  const makeCve = (): Cve =>
    ({
      cveId: 'CVE-2021-44228',
      severity: 'UNKNOWN',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 0n,
      intelUpdatedAtUnixSeconds: 0n,
      researchSummary: '',
    }) as Cve;

  const makeDoc = (): CveResearchDocument =>
    ({
      id: 'doc-1',
      cve: makeCve(),
      source: 'user_upload',
      title: 't',
      content: 'c',
      createdAtUnixSeconds: 1n,
    }) as CveResearchDocument;

  beforeEach(async () => {
    dataSourceMock.getRepository.mockImplementation((entity: unknown) => {
      if (entity === Cve) {
        return cveRepoMock as unknown as Repository<Cve>;
      }
      if (entity === CveResearchDocument) {
        return docRepoMock as unknown as Repository<CveResearchDocument>;
      }
      throw new Error(`unexpected entity ${String(entity)}`);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CveResearchDocumentsService,
        { provide: DATA_SOURCE, useValue: dataSourceMock as unknown as DataSource },
      ],
    }).compile();

    service = module.get<CveResearchDocumentsService>(CveResearchDocumentsService);
    jest.clearAllMocks();
  });

  it('list() throws when CVE missing', async () => {
    cveRepoMock.findOne.mockResolvedValue(null);

    await expect(service.list('CVE-2021-44228')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('list() returns documents', async () => {
    const cve = makeCve();
    cveRepoMock.findOne.mockResolvedValue(cve);
    const docs = [makeDoc()];
    docRepoMock.find.mockResolvedValue(docs);

    await expect(service.list('CVE-2021-44228')).resolves.toEqual(docs);
    expect(docRepoMock.find).toHaveBeenCalled();
  });

  it('getById() throws when document missing', async () => {
    cveRepoMock.findOne.mockResolvedValueOnce(makeCve());
    docRepoMock.findOne.mockResolvedValue(null);

    await expect(service.getById('CVE-2021-44228', 'doc-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create() saves with CVE relation', async () => {
    const cve = makeCve();
    cveRepoMock.findOne.mockResolvedValue(cve);
    const created = makeDoc();
    docRepoMock.create.mockReturnValue(created);
    docRepoMock.save.mockResolvedValue(created);

    const dto = { title: 't', content: 'c' };
    const result = await service.create('CVE-2021-44228', dto);

    expect(docRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'user_upload', title: 't', content: 'c' }),
    );
    expect(docRepoMock.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });

  it('createAgentLookup() throws when CVE missing', async () => {
    cveRepoMock.findOne.mockResolvedValue(null);

    await expect(
      service.createAgentLookup('CVE-2021-44228', {
        title: 't',
        content: 'c',
        createdAtUnixSeconds: 99n,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(docRepoMock.create).not.toHaveBeenCalled();
  });

  it('createAgentLookup() saves agent_lookup with explicit timestamp', async () => {
    const cve = makeCve();
    cveRepoMock.findOne.mockResolvedValue(cve);
    const created = {
      ...makeDoc(),
      source: 'agent_lookup' as const,
      title: 'Advisory — https://example.com — fetched at: 2025-05-08T17:20:00Z',
      content: '> **Fetched at:** …\n\nbody',
      createdAtUnixSeconds: 1_746_724_800n,
    };
    docRepoMock.create.mockReturnValue(created);
    docRepoMock.save.mockResolvedValue(created);

    const input = {
      title: created.title,
      content: created.content,
      createdAtUnixSeconds: 1_746_724_800n,
    };
    const result = await service.createAgentLookup('CVE-2021-44228', input);

    expect(docRepoMock.create).toHaveBeenCalledWith({
      cve,
      source: 'agent_lookup',
      title: input.title,
      content: input.content,
      createdAtUnixSeconds: input.createdAtUnixSeconds,
    });
    expect(docRepoMock.save).toHaveBeenCalledWith(created);
    expect(result).toEqual(created);
  });

  it('update() throws when body empty', async () => {
    await expect(service.update('CVE-2021-44228', 'doc-1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('update() patches fields', async () => {
    const doc = makeDoc();
    cveRepoMock.findOne.mockResolvedValue(makeCve());
    docRepoMock.findOne.mockResolvedValue(doc);
    docRepoMock.save.mockImplementation(async (d) => d);

    const updated = await service.update('CVE-2021-44228', 'doc-1', { title: 'new' });

    expect(updated.title).toBe('new');
    expect(docRepoMock.save).toHaveBeenCalled();
  });

  it('delete() calls delete after load', async () => {
    cveRepoMock.findOne.mockResolvedValue(makeCve());
    docRepoMock.findOne.mockResolvedValue(makeDoc());
    docRepoMock.delete.mockResolvedValue({ affected: 1 });

    await service.delete('CVE-2021-44228', 'doc-1');

    expect(docRepoMock.delete).toHaveBeenCalledWith({
      id: 'doc-1',
      cve: { cveId: 'CVE-2021-44228' },
    });
  });
});
