import { test, expect, describe, beforeEach, afterEach, jest } from '@jest/globals';
import type { DataSource } from 'typeorm';
import { StoredFileUploadTimeoutWorker } from '../../src/workers/storedFileUploadTimeout/definition.js';
import { StoredFile } from '../../src/db/entities/stored_files/definition.js';
import type { PinoLogger } from 'nestjs-pino';

describe('StoredFileUploadTimeoutWorker', () => {
  const findMock = jest.fn<() => Promise<StoredFile[]>>();
  const saveMock = jest.fn<(entity: StoredFile) => Promise<StoredFile>>();
  const getRepositoryMock = jest.fn<(target: unknown) => { find: typeof findMock; save: typeof saveMock }>();
  const transactionMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  const storedFileRepoMock = {
    find: findMock,
    save: saveMock,
  };

  const managerMock = {
    getRepository: getRepositoryMock,
  };

  const dataSourceMock = {
    transaction: transactionMock,
  };

  const loggerMock: Pick<PinoLogger, 'info' | 'error'> = {
    info: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getRepositoryMock.mockReturnValue(storedFileRepoMock);
    transactionMock.mockImplementation(async (...args: unknown[]) => {
      const callback = args[0] as (manager: typeof managerMock) => Promise<void>;
      await callback(managerMock);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('process() marks stale uploading files as failed', async () => {
    const stale1 = {
      id: 'sf-1',
      status: 'uploading',
      extension: 'tar',
      sizeBytes: null,
      uploadStartedAtUnixSeconds: 1n,
      createdAtUnixSeconds: 1n,
    } as StoredFile;
    const stale2 = {
      id: 'sf-2',
      status: 'uploading',
      extension: 'tar',
      sizeBytes: null,
      uploadStartedAtUnixSeconds: 2n,
      createdAtUnixSeconds: 2n,
    } as StoredFile;
    findMock.mockResolvedValue([stale1, stale2] as StoredFile[]);
    saveMock.mockImplementation(async (entity: StoredFile) => entity);

    const worker = new StoredFileUploadTimeoutWorker(
      dataSourceMock as unknown as DataSource,
      60,
      1800,
      loggerMock as PinoLogger,
    );

    const result = await worker.process();

    expect(result.success).toBe(true);
    expect(dataSourceMock.transaction).toHaveBeenCalledTimes(1);
    expect(storedFileRepoMock.find).toHaveBeenCalledTimes(1);
    expect(storedFileRepoMock.save).toHaveBeenCalledTimes(2);
    expect(stale1.status).toBe('failed');
    expect(stale2.status).toBe('failed');
  });

  test('process() returns error result when transaction fails', async () => {
    transactionMock.mockRejectedValueOnce(new Error('db unavailable'));
    const worker = new StoredFileUploadTimeoutWorker(
      dataSourceMock as unknown as DataSource,
      60,
      1800,
      loggerMock as PinoLogger,
    );

    const result = await worker.process();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('db unavailable');
    }
  });
});
