import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { ImageCvesService } from '../../../../src/server/components/image_cves/image_cves.service.js';
import { DATA_SOURCE } from '../../../../src/server/database/database.constants.js';
import { ImageCve } from '../../../../src/db/entities/image_cve/definition.js';
import { Cve } from '../../../../src/db/entities/cves/definition.js';
import { ContainerImage } from '../../../../src/db/entities/container_images/definition.js';
import { Component } from '../../../../src/db/entities/components/definition.js';

describe('ImageCvesService', () => {
  let service: ImageCvesService;

  const imageCveRepoMock = {
    find: jest.fn<Repository<ImageCve>['find']>(),
    findOne: jest.fn<Repository<ImageCve>['findOne']>(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const componentRepoMock = {
    findOne: jest.fn<Repository<Component>['findOne']>(),
  };

  const containerImageRepoMock = {
    findOne: jest.fn<Repository<ContainerImage>['findOne']>(),
  };

  const cveRepoMock = {
    findOne: jest.fn<Repository<Cve>['findOne']>(),
  };

  const dataSourceMock = {
    transaction: jest.fn(),
    getRepository: jest.fn(),
  };

  const makeComponent = (): Component =>
    ({
      id: 'comp-1',
      name: 'svc',
      description: 'd',
      project: { id: 'proj-1', name: 'proj', description: 'pd' },
    }) as Component;

  const makeImage = (): ContainerImage =>
    ({
      id: 'img-1',
      chainIndex: 2,
      createdAtUnixSeconds: 10n,
    }) as ContainerImage;

  const makeCve = (): Cve =>
    ({
      cveId: 'CVE-2021-44228',
      severity: 'UNKNOWN',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 0n,
      intelUpdatedAtUnixSeconds: 0n,
      researchSummary: '',
    }) as Cve;

  const makeImageCve = (overrides: Partial<ImageCve> = {}): ImageCve =>
    ({
      id: 'icve-1',
      cve: makeCve(),
      source: 'manual',
      firstIntroducedChainIndex: 2,
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
    }) as unknown as ImageCve;

  beforeEach(async () => {
    dataSourceMock.transaction.mockReset();
    dataSourceMock.getRepository.mockReset();
    imageCveRepoMock.find.mockReset();
    imageCveRepoMock.findOne.mockReset();
    componentRepoMock.findOne.mockReset();
    containerImageRepoMock.findOne.mockReset();

    dataSourceMock.getRepository.mockImplementation((entity: unknown) => {
      if (entity === ImageCve) {
        return imageCveRepoMock as unknown as Repository<ImageCve>;
      }
      if (entity === Component) {
        return componentRepoMock as unknown as Repository<Component>;
      }
      if (entity === ContainerImage) {
        return containerImageRepoMock as unknown as Repository<ContainerImage>;
      }
      throw new Error(`Unexpected entity in getRepository mock: ${String(entity)}`);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageCvesService, { provide: DATA_SOURCE, useValue: dataSourceMock as unknown as DataSource }],
    }).compile();

    service = module.get<ImageCvesService>(ImageCvesService);
    jest.clearAllMocks();
  });

  it('list() throws when component is missing', async () => {
    componentRepoMock.findOne.mockResolvedValue(null);

    await expect(service.list('proj-1', 'comp-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('list() throws when no container image', async () => {
    componentRepoMock.findOne.mockResolvedValue(makeComponent());
    containerImageRepoMock.findOne.mockResolvedValue(null);

    await expect(service.list('proj-1', 'comp-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('list() returns imageCves from repository', async () => {
    componentRepoMock.findOne.mockResolvedValue(makeComponent());
    containerImageRepoMock.findOne.mockResolvedValue(makeImage());
    const cve = makeCve();
    const row = {
      id: 'icve-1',
      cve,
      source: 'manual',
      firstIntroducedChainIndex: 2,
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
    } as unknown as ImageCve;
    imageCveRepoMock.find.mockResolvedValue([row]);

    const result = await service.list('proj-1', 'comp-1');
    expect(result.imageCves).toHaveLength(1);
    expect(result.imageCves[0].cveId).toBe('CVE-2021-44228');
    expect(result.imageCves[0].imageCveId).toBe('icve-1');
    expect(result.imageCves[0].vexStateKind).toBe('under_investigation_fresh');
    expect(result.imageCves[0].expiryTimeUnixSeconds).toBeNull();
  });

  it('listDisabled() returns disabled rows', async () => {
    componentRepoMock.findOne.mockResolvedValue(makeComponent());
    containerImageRepoMock.findOne.mockResolvedValue(makeImage());
    const disabledA = makeImageCve({
      id: 'icve-active',
      isDisabled: true,
      disabledReason: 'maintenance',
    });
    const disabledB = makeImageCve({
      id: 'icve-expired',
      isDisabled: true,
      disabledReason: 'old',
    });
    imageCveRepoMock.find.mockResolvedValue([disabledA, disabledB]);

    const result = await service.listDisabled('proj-1', 'comp-1');
    expect(result.imageCves).toHaveLength(2);
    expect(result.imageCves[0].imageCveId).toBe('icve-active');
    expect(result.imageCves[0].disableState.state).toBe('disabled');
  });

  it('linkToCurrentImage() rejects unknown CVE id format before transaction', async () => {
    await expect(service.linkToCurrentImage('proj-1', 'comp-1', ['not-a-cve'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(dataSourceMock.transaction).not.toHaveBeenCalled();
  });

  it('linkToCurrentImage() runs transaction and returns ok', async () => {
    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (m: EntityManager) => Promise<void>;
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Component) {
            return {
              findOne: async () => makeComponent(),
            };
          }
          if (entity === ContainerImage) {
            return {
              findOne: async () => makeImage(),
            };
          }
          if (entity === Cve) {
            return {
              findOne: async () => makeCve(),
            };
          }
          if (entity === ImageCve) {
            return {
              findOne: async () => null,
              create: (x: unknown) => x,
              save: async (x: unknown) => x,
            };
          }
          throw new Error('unexpected');
        },
      };
      return fn(manager as unknown as EntityManager);
    });

    const result = await service.linkToCurrentImage('proj-1', 'comp-1', ['CVE-2021-44228']);
    expect(result).toEqual({ status: 'ok' });
    expect(dataSourceMock.transaction).toHaveBeenCalled();
  });

  it('linkToCurrentImage() throws NotFound when CVE row missing', async () => {
    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (m: EntityManager) => Promise<void>;
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Component) {
            return { findOne: async () => makeComponent() };
          }
          if (entity === ContainerImage) {
            return { findOne: async () => makeImage() };
          }
          if (entity === Cve) {
            return { findOne: async () => null };
          }
          return { findOne: async () => null, save: async () => undefined, create: () => ({}) };
        },
      };
      return fn(manager as unknown as EntityManager);
    });

    await expect(
      service.linkToCurrentImage('proj-1', 'comp-1', ['CVE-2021-44228']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getById() throws when association missing', async () => {
    componentRepoMock.findOne.mockResolvedValue(makeComponent());
    containerImageRepoMock.findOne.mockResolvedValue(makeImage());
    imageCveRepoMock.findOne.mockResolvedValue(null);

    await expect(
      service.getById('proj-1', 'comp-1', '00000000-0000-4000-8000-000000000099'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('disable() updates disable fields and keeps decision expiry untouched', async () => {
    const row = makeImageCve({ expiryTimeUnixSeconds: 999n });
    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (m: EntityManager) => Promise<unknown>;
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Component) {
            return { findOne: async () => makeComponent() };
          }
          if (entity === ContainerImage) {
            return { findOne: async () => makeImage() };
          }
          if (entity === ImageCve) {
            return {
              findOne: async () => row,
              save: async (x: ImageCve) => x,
            };
          }
          throw new Error('unexpected');
        },
      };
      return fn(manager as unknown as EntityManager);
    });

    const result = await service.disable('proj-1', 'comp-1', 'icve-1', 'maintenance');
    expect(result.disableState.state).toBe('disabled');
    expect(row.expiryTimeUnixSeconds).toBe(999n);
  });

  it('reuseDecision() rejects when state is not reusable', async () => {
    const row = makeImageCve({
      storedInternalStatement: {
        status: 'under_investigation',
        context: { type: 'fresh' },
      },
    });
    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (m: EntityManager) => Promise<unknown>;
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Component) {
            return { findOne: async () => makeComponent() };
          }
          if (entity === ContainerImage) {
            return { findOne: async () => makeImage() };
          }
          if (entity === ImageCve) {
            return {
              findOne: async () => row,
              save: async (x: ImageCve) => x,
            };
          }
          throw new Error('unexpected');
        },
      };
      return fn(manager as unknown as EntityManager);
    });

    await expect(
      service.reuseDecision('proj-1', 'comp-1', 'icve-1', '4070908800'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reuseDecision() promotes expired snapshot and renews expiry', async () => {
    const row = makeImageCve({
      storedInternalStatement: {
        status: 'under_investigation',
        context: {
          type: 'expired',
          expiredDecision: {
            status: 'not_affected',
            justification: 'component_not_present',
            impact_statement: 'not present',
            status_notes: 'safe runtime',
          },
        },
      },
      expiryTimeUnixSeconds: null,
    });
    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (m: EntityManager) => Promise<unknown>;
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Component) {
            return { findOne: async () => makeComponent() };
          }
          if (entity === ContainerImage) {
            return { findOne: async () => makeImage() };
          }
          if (entity === ImageCve) {
            return {
              findOne: async () => row,
              save: async (x: ImageCve) => x,
            };
          }
          throw new Error('unexpected');
        },
      };
      return fn(manager as unknown as EntityManager);
    });

    const result = await service.reuseDecision(
      'proj-1',
      'comp-1',
      'icve-1',
      '4070908800',
    );
    expect(row.storedInternalStatement.status).toBe('not_affected');
    expect(result.decision.status).toBe('not_affected');
    expect(row.expiryTimeUnixSeconds).not.toBeNull();
  });

  it('rejectDecisionReuse() resets to default under_investigation fresh', async () => {
    const row = makeImageCve({
      storedInternalStatement: {
        status: 'under_investigation',
        context: {
          type: 'carry_forward',
          priorDecision: {
            status: 'affected',
            action_statement: 'upgrade',
            status_notes: 'needed',
          },
        },
      },
      expiryTimeUnixSeconds: 1000n,
    });
    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (m: EntityManager) => Promise<unknown>;
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Component) {
            return { findOne: async () => makeComponent() };
          }
          if (entity === ContainerImage) {
            return { findOne: async () => makeImage() };
          }
          if (entity === ImageCve) {
            return {
              findOne: async () => row,
              save: async (x: ImageCve) => x,
            };
          }
          throw new Error('unexpected');
        },
      };
      return fn(manager as unknown as EntityManager);
    });

    const result = await service.rejectDecisionReuse('proj-1', 'comp-1', 'icve-1');
    expect(row.storedInternalStatement.status).toBe('under_investigation');
    if (row.storedInternalStatement.status === 'under_investigation') {
      expect(row.storedInternalStatement.context).toEqual({ type: 'fresh' });
    }
    expect(row.expiryTimeUnixSeconds).toBeNull();
    expect(result.decision.status).toBe('under_investigation');
  });

  it('updateAdviceByCveId() resolves row by cveId on current image and persists advice', async () => {
    const row = makeImageCve({ advice: null });
    componentRepoMock.findOne.mockResolvedValue(makeComponent());
    containerImageRepoMock.findOne.mockResolvedValue(makeImage());
    imageCveRepoMock.findOne.mockResolvedValue(row);

    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (m: EntityManager) => Promise<unknown>;
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Component) {
            return { findOne: async () => makeComponent() };
          }
          if (entity === ContainerImage) {
            return { findOne: async () => makeImage() };
          }
          if (entity === ImageCve) {
            return {
              findOne: async () => row,
              save: async (x: ImageCve) => x,
            };
          }
          throw new Error('unexpected');
        },
      };
      return fn(manager as unknown as EntityManager);
    });

    const result = await service.updateAdviceByCveId(
      'proj-1',
      'comp-1',
      'CVE-2021-44228',
      'Apply patched base image',
    );

    expect(imageCveRepoMock.findOne).toHaveBeenCalled();
    expect(row.advice).toEqual(
      expect.objectContaining({
        content: 'Apply patched base image',
        adviceGeneratedAtUnixSeconds: expect.any(String),
      }),
    );
    expect(result.cveId).toBe('CVE-2021-44228');
    expect(result.advice).toEqual(
      expect.objectContaining({
        state: 'set',
        content: 'Apply patched base image',
      }),
    );
  });

  it('updateAdviceByCveId() throws when CVE row missing on current image', async () => {
    componentRepoMock.findOne.mockResolvedValue(makeComponent());
    containerImageRepoMock.findOne.mockResolvedValue(makeImage());
    imageCveRepoMock.findOne.mockResolvedValue(null);

    await expect(
      service.updateAdviceByCveId('proj-1', 'comp-1', 'CVE-2021-44228', 'x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateAdvice() writes manual advice content', async () => {
    const row = makeImageCve({ advice: null });
    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (m: EntityManager) => Promise<unknown>;
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Component) {
            return { findOne: async () => makeComponent() };
          }
          if (entity === ContainerImage) {
            return { findOne: async () => makeImage() };
          }
          if (entity === ImageCve) {
            return {
              findOne: async () => row,
              save: async (x: ImageCve) => x,
            };
          }
          throw new Error('unexpected');
        },
      };
      return fn(manager as unknown as EntityManager);
    });

    const result = await service.updateAdvice('proj-1', 'comp-1', 'icve-1', 'Apply patched base image');
    expect(row.advice).toEqual(
      expect.objectContaining({
        content: 'Apply patched base image',
        adviceGeneratedAtUnixSeconds: expect.any(String),
      }),
    );
    expect(result.advice).toEqual(
      expect.objectContaining({
        state: 'set',
        content: 'Apply patched base image',
        adviceGeneratedAtUnixSeconds: expect.any(String),
      }),
    );
    if (result.advice.state === 'set') {
      expect(result.advice.adviceGeneratedAtUnixSeconds).toBe(
        (row.advice as { adviceGeneratedAtUnixSeconds: string }).adviceGeneratedAtUnixSeconds,
      );
    }
  });

  it('updateDecision() rejects invalid payload', async () => {
    await expect(
      service.updateDecision('proj-1', 'comp-1', 'icve-1', {
        status: 'not_affected',
        justification: 'component_not_present',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updateDecision() writes affected decision and expiry', async () => {
    const row = makeImageCve();
    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (m: EntityManager) => Promise<unknown>;
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Component) {
            return { findOne: async () => makeComponent() };
          }
          if (entity === ContainerImage) {
            return { findOne: async () => makeImage() };
          }
          if (entity === ImageCve) {
            return {
              findOne: async () => row,
              save: async (x: ImageCve) => x,
            };
          }
          throw new Error('unexpected');
        },
      };
      return fn(manager as unknown as EntityManager);
    });

    const result = await service.updateDecision('proj-1', 'comp-1', 'icve-1', {
      status: 'affected',
      action_statement: 'upgrade image',
      status_notes: 'reachable runtime',
      expiryTimeUnixSeconds: '4070908800',
    });

    expect(row.storedInternalStatement).toEqual({
      status: 'affected',
      action_statement: 'upgrade image',
      status_notes: 'reachable runtime',
    });
    expect(row.expiryTimeUnixSeconds).toBe(4070908800n);
    expect(result.decision.status).toBe('affected');
  });

  it('refreshDecisionExpiry() converts expired resolved decision and clears expiry', async () => {
    const row = makeImageCve({
      storedInternalStatement: {
        status: 'not_affected',
        justification: 'component_not_present',
        impact_statement: 'not present',
        status_notes: 'verified',
      },
      expiryTimeUnixSeconds: 1n,
      decisionRecordedAtUnixSeconds: 1n,
    });
    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (m: EntityManager) => Promise<unknown>;
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Component) {
            return { findOne: async () => makeComponent() };
          }
          if (entity === ContainerImage) {
            return { findOne: async () => makeImage() };
          }
          if (entity === ImageCve) {
            return {
              findOne: async () => row,
              save: async (x: ImageCve) => x,
            };
          }
          throw new Error('unexpected');
        },
      };
      return fn(manager as unknown as EntityManager);
    });

    const result = await service.refreshDecisionExpiry('proj-1', 'comp-1', 'icve-1');
    expect(row.storedInternalStatement.status).toBe('under_investigation');
    expect(row.expiryTimeUnixSeconds).toBeNull();
    expect(result.decision.status).toBe('under_investigation');
    if (result.decision.status === 'under_investigation') {
      expect(result.decision.additionalData.type).toBe('expired');
    }
  });

  it('refreshDecisionExpiry() throws when scoped row missing', async () => {
    dataSourceMock.transaction.mockImplementation(async (...args: unknown[]) => {
      const fn = args[0] as (m: EntityManager) => Promise<unknown>;
      const manager = {
        getRepository: (entity: unknown) => {
          if (entity === Component) {
            return { findOne: async () => makeComponent() };
          }
          if (entity === ContainerImage) {
            return { findOne: async () => makeImage() };
          }
          if (entity === ImageCve) {
            return {
              findOne: async () => null,
            };
          }
          throw new Error('unexpected');
        },
      };
      return fn(manager as unknown as EntityManager);
    });

    await expect(service.refreshDecisionExpiry('proj-1', 'comp-1', 'icve-missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
