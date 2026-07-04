import { z } from 'zod';

/** Required half-open `[startChar, endChar)` inputs for agent DB reads of large text fields. */
export const TextSliceFieldsSchema = z
    .object({
        startChar: z
            .number()
            .int()
            .min(0)
            .describe('Half-open slice start (inclusive). Use 0 on first read when length is unknown.'),
        endChar: z
            .number()
            .int()
            .min(0)
            .describe('Half-open slice end (exclusive). Use 200 on first read when length is unknown.'),
    })
    .refine((v) => v.endChar > v.startChar, {
        message: 'endChar must be greater than startChar',
    });

export type TextSliceInput = z.infer<typeof TextSliceFieldsSchema>;

export type TextSliceResult = {
    charLength: number;
    returnedStartChar: number;
    returnedEndChar: number;
    content: string;
};

/**
 * Clamps and slices full text (half-open range, safe end clamp).
 * Slicing runs after fetch in the agent tool layer — not in SQL.
 */
export function sliceTextContent(
    fullText: string,
    startChar: number,
    endChar: number,
): TextSliceResult {
    const charLength = fullText.length;
    const returnedStartChar = Math.min(Math.max(0, startChar), charLength);
    const returnedEndChar = Math.min(Math.max(returnedStartChar, endChar), charLength);
    const content = fullText.slice(returnedStartChar, returnedEndChar);

    return { charLength, returnedStartChar, returnedEndChar, content };
}
