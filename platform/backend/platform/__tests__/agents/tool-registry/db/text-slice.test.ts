import { describe, it, expect } from '@jest/globals';

import { sliceTextContent, TextSliceFieldsSchema } from '../../../../src/agents/tool-registry/db/text-slice.js';

describe('text-slice', () => {
    const full = 'abcdefghijklmnopqrstuvwxyz';

    it('sliceTextContent returns half-open slice with metadata', () => {
        expect(sliceTextContent(full, 0, 5)).toEqual({
            charLength: 26,
            returnedStartChar: 0,
            returnedEndChar: 5,
            content: 'abcde',
        });
    });

    it('sliceTextContent clamps endChar beyond charLength', () => {
        expect(sliceTextContent(full, 0, 100)).toEqual({
            charLength: 26,
            returnedStartChar: 0,
            returnedEndChar: 26,
            content: full,
        });
    });

    it('sliceTextContent clamps startChar beyond charLength', () => {
        expect(sliceTextContent(full, 50, 60)).toEqual({
            charLength: 26,
            returnedStartChar: 26,
            returnedEndChar: 26,
            content: '',
        });
    });

    it('sliceTextContent clamps negative startChar via max(0, startChar)', () => {
        expect(sliceTextContent(full, -3, 4)).toEqual({
            charLength: 26,
            returnedStartChar: 0,
            returnedEndChar: 4,
            content: 'abcd',
        });
    });

    it('TextSliceFieldsSchema rejects endChar <= startChar', () => {
        const result = TextSliceFieldsSchema.safeParse({ startChar: 10, endChar: 10 });
        expect(result.success).toBe(false);
    });
});
