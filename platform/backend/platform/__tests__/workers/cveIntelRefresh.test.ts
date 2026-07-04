import { test, expect, describe, beforeEach, afterEach, jest } from '@jest/globals';
import type { DataSource } from 'typeorm';
import { CveIntelRefreshWorker } from '../../src/workers/cveIntelRefresh/definition.js';
import { Cve } from '../../src/db/entities/cves/definition.js';
import type { PinoLogger } from 'nestjs-pino';
import { getCurrentTimeUnixSeconds } from '../../src/utils/time.js';
import { refreshCveIntel } from '../../src/cveIntelRefresh/definition.js';

jest.mock('../../src/cveIntelRefresh/definition.js', () => ({
  refreshCveIntel: jest.fn(),
}));

const refreshCveIntelMock = jest.mocked(refreshCveIntel);

/** Batch size passed into the worker under test (mirrors app wiring). */
const DEFAULT_STALE_BATCH = 10;

describe('CveIntelRefreshWorker', () => {
  const findMock = jest.fn<() => Promise<Cve[]>>();
  const getRepositoryMock = jest.fn<(target: unknown) => { find: typeof findMock }>();

  const dataSourceMock = {
    getRepository: getRepositoryMock,
  };

  const loggerMock: Pick<PinoLogger, 'info' | 'error'> = {
    info: jest.fn(),
    error: jest.fn(),
  };

  const nvdMock = { getCVEData: jest.fn() };
  const epssMock = { getCVE_EPSSData: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    getRepositoryMock.mockReturnValue({ find: findMock });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('process() does not call refresh when no CVEs are stale', async () => {
    findMock.mockResolvedValue([]);

    const worker = new CveIntelRefreshWorker(
      dataSourceMock as unknown as DataSource,
      60,
      3600,
      loggerMock as PinoLogger,
      nvdMock as never,
      epssMock as never,
      DEFAULT_STALE_BATCH,
    );

    const result = await worker.process();

    expect(result.success).toBe(true);
    expect(findMock).toHaveBeenCalledTimes(1);
    expect(refreshCveIntelMock).not.toHaveBeenCalled();
    expect(loggerMock.info).not.toHaveBeenCalled();
  });

  test('process() refreshes each stale CVE returned by the repository', async () => {
    const now = getCurrentTimeUnixSeconds();
    const staleA = {
      cveId: 'CVE-2021-11111',
      severity: 'HIGH',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 0n,
      intelUpdatedAtUnixSeconds: now - 10_000n,
      researchSummary: '',
    } as Cve;
    const staleB = {
      cveId: 'CVE-2021-22222',
      severity: 'MEDIUM',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 0n,
      intelUpdatedAtUnixSeconds: now - 20_000n,
      researchSummary: '',
    } as Cve;
    findMock.mockResolvedValue([staleA, staleB]);
    refreshCveIntelMock.mockResolvedValue({ ok: true });

    const worker = new CveIntelRefreshWorker(
      dataSourceMock as unknown as DataSource,
      60,
      3600,
      loggerMock as PinoLogger,
      nvdMock as never,
      epssMock as never,
      DEFAULT_STALE_BATCH,
    );

    const result = await worker.process();

    expect(result.success).toBe(true);
    expect(refreshCveIntelMock).toHaveBeenCalledTimes(2);
    expect(refreshCveIntelMock.mock.calls[0][2]).toBe('CVE-2021-11111');
    expect(refreshCveIntelMock.mock.calls[1][2]).toBe('CVE-2021-22222');
    expect(refreshCveIntelMock.mock.calls[0][1]).toEqual({ nvd: nvdMock, epss: epssMock });
    expect(loggerMock.info).not.toHaveBeenCalled();
  });

  test('process() continues when refreshCveIntel returns cve_not_found', async () => {
    const now = getCurrentTimeUnixSeconds();
    const stale = {
      cveId: 'CVE-1999-00001',
      severity: 'UNKNOWN',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 0n,
      intelUpdatedAtUnixSeconds: now - 99_999n,
      researchSummary: '',
    } as Cve;
    findMock.mockResolvedValue([stale]);
    refreshCveIntelMock.mockResolvedValue({ ok: false, reason: 'cve_not_found' });

    const worker = new CveIntelRefreshWorker(
      dataSourceMock as unknown as DataSource,
      60,
      7200,
      loggerMock as PinoLogger,
      nvdMock as never,
      epssMock as never,
      DEFAULT_STALE_BATCH,
    );

    const result = await worker.process();

    expect(result.success).toBe(true);
    expect(refreshCveIntelMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).not.toHaveBeenCalled();
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  test('process() returns error when refreshCveIntel throws', async () => {
    const now = getCurrentTimeUnixSeconds();
    const stale = {
      cveId: 'CVE-2020-0001',
      severity: 'LOW',
      intelHighlights: null,
      intelLastAttemptAtUnixSeconds: 0n,
      intelUpdatedAtUnixSeconds: now - 50_000n,
      researchSummary: '',
    } as Cve;
    findMock.mockResolvedValue([stale]);
    refreshCveIntelMock.mockRejectedValue(new Error('transaction failed'));

    const worker = new CveIntelRefreshWorker(
      dataSourceMock as unknown as DataSource,
      60,
      3600,
      loggerMock as PinoLogger,
      nvdMock as never,
      epssMock as never,
      DEFAULT_STALE_BATCH,
    );

    const result = await worker.process();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('transaction failed');
    }
  });

  test('process() queries stale CVEs with injected batch size and oldest-first ordering', async () => {
    findMock.mockResolvedValue([]);
    const batchSize = 17;

    const worker = new CveIntelRefreshWorker(
      dataSourceMock as unknown as DataSource,
      60,
      86400,
      loggerMock as PinoLogger,
      nvdMock as never,
      epssMock as never,
      batchSize,
    );

    await worker.process();

    expect(findMock).toHaveBeenCalledTimes(1);
    const findArgs = (findMock as unknown as jest.Mock).mock.calls[0] as [Record<string, unknown>];
    const arg = findArgs[0] as {
      where: Record<string, unknown>;
      order: Record<string, string>;
      take: number;
    };
    expect(arg).toMatchObject({
      take: batchSize,
      order: { intelUpdatedAtUnixSeconds: 'ASC' },
    });
    expect(arg.where).toHaveProperty('intelUpdatedAtUnixSeconds');
  });
});
