import { describe, it, expect } from '@jest/globals';
import {
  buildStoredAdvice,
  parseStoredAdvice,
} from '../../../../src/server/components/image_cves/advice.js';

describe('image_cve advice storage', () => {
  it('buildStoredAdvice() returns JSON-serializable int64 string timestamp', () => {
    expect(buildStoredAdvice('text', 1_700_000_000n)).toEqual({
      content: 'text',
      adviceGeneratedAtUnixSeconds: '1700000000',
    });
  });

  it('parseStoredAdvice() accepts string timestamp from JSONB', () => {
    expect(
      parseStoredAdvice({
        content: 'Apply patch',
        adviceGeneratedAtUnixSeconds: '42',
      }),
    ).toEqual({
      content: 'Apply patch',
      adviceGeneratedAtUnixSeconds: 42n,
    });
  });

  it('parseStoredAdvice() rejects content-only payload', () => {
    expect(parseStoredAdvice({ content: 'orphan' })).toBeNull();
  });

  it('parseStoredAdvice() rejects null and invalid shapes', () => {
    expect(parseStoredAdvice(null)).toBeNull();
    expect(parseStoredAdvice({ content: 1, adviceGeneratedAtUnixSeconds: 1n })).toBeNull();
  });
});
