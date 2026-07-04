import { describe, expect, it } from '@jest/globals';

import { unixSecondsToIso8601Utc } from '../../src/utils/time.js';

describe('utils/time', () => {
    it('unixSecondsToIso8601Utc formats ISO 8601 UTC', () => {
        expect(unixSecondsToIso8601Utc(1_746_724_800n)).toBe('2025-05-08T17:20:00Z');
    });
});
