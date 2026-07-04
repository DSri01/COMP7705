/**
 * Truncates text to a maximum character length, appending an omission marker.
 *
 * @param text - Raw string (tool output, summary fragment, etc.).
 * @param maxChars - Inclusive maximum length before truncation.
 * @returns Truncated text and whether truncation occurred.
 */
export function truncateText(text: string, maxChars: number): { text: string; truncated: boolean } {
    if (text.length <= maxChars) {
        return { text, truncated: false };
    }
    const omitted = text.length - maxChars;
    return {
        text: `${text.slice(0, maxChars)}\n…[truncated, ${omitted} chars omitted]`,
        truncated: true,
    };
}

/**
 * Sums string lengths as a cheap prompt-size estimate (no tokenizer).
 *
 * @param parts - Prompt sections to measure.
 */
export function estimateChars(parts: string[]): number {
    return parts.reduce((sum, part) => sum + part.length, 0);
}
