import { test, expect, describe, beforeEach, afterEach, jest } from '@jest/globals';
import { BasePollingWorker } from '../../src/workers/base.js';
import { sleepMilliseconds } from '../../src/utils/time.js';
import type { PinoLogger } from 'nestjs-pino';

jest.mock('../../src/utils/time.js', () => ({
  sleepMilliseconds: jest.fn(async () => undefined),
}));

describe('BasePollingWorker', () => {
  const loggerMock: Pick<PinoLogger, 'info' | 'error'> = {
    info: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('process() default implementation returns not implemented error', async () => {
    const worker = new BasePollingWorker(5, loggerMock as PinoLogger, 'base-worker-test');
    const result = await worker.process();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('Not implemented');
    }
  });

  test('startLoop() runs process, logs errors, and can be paused', async () => {
    class TestWorker extends BasePollingWorker {
      calls = 0;
      override process = async () => {
        this.calls += 1;
        this.pauseLoop();
        return {
          success: false as const,
          error: new Error('boom'),
        };
      };
    }

    const worker = new TestWorker(2, loggerMock as PinoLogger, 'test-worker');
    await worker.startLoop();

    expect(worker.calls).toBe(1);
    expect((sleepMilliseconds as jest.MockedFunction<typeof sleepMilliseconds>)).toHaveBeenCalledWith(2000);
  });
});