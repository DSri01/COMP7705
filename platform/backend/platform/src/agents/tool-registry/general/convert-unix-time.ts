import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const ConvertUnixTimeInputSchema = z.object({
    direction: z
        .enum(['unix_to_human', 'human_to_unix'])
        .describe(
            'unix_to_human: platform unix-seconds string → UTC human-readable; ' +
                'human_to_unix: UTC human-readable → unix-seconds string',
        ),
    value: z.string().describe('Unix seconds (decimal string) or human-readable UTC time to convert'),
});

export type ConvertUnixTimeInput = z.infer<typeof ConvertUnixTimeInputSchema>;

/** Matches dashboard {@link parseUnixSeconds}. */
export function parseUnixSeconds(unixSeconds: string): Date {
    return new Date(parseInt(unixSeconds, 10) * 1000);
}

/** Matches dashboard `formatTime` — UTC `YYYY-MM-DD HH:mm:ss` (no sub-second fraction). */
export function formatTime(date: Date): string {
    return date.toISOString().replace('T', ' ').replace('.000Z', '');
}

/**
 * Parses human-readable UTC produced by {@link formatTime}, or ISO-8601 with `T` / `Z`.
 */
export function parseHumanUtcTime(human: string): Date {
    const trimmed = human.trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        return new Date(`${trimmed.replace(' ', 'T')}Z`);
    }
    return new Date(trimmed);
}

/**
 * Converts between platform unix-seconds strings and dashboard-style UTC timestamps.
 *
 * @returns Converted value, or `ERROR: …` when input is invalid.
 */
export function convertUnixTimeHandler({ direction, value }: ConvertUnixTimeInput): string {
    if (direction === 'unix_to_human') {
        const trimmed = value.trim();
        if (!/^\d+$/.test(trimmed)) {
            return 'ERROR: unix seconds must be a non-negative decimal string';
        }
        const date = parseUnixSeconds(trimmed);
        if (Number.isNaN(date.getTime())) {
            return 'ERROR: invalid unix seconds';
        }
        return formatTime(date);
    }

    const date = parseHumanUtcTime(value);
    if (Number.isNaN(date.getTime())) {
        return 'ERROR: invalid human-readable UTC time (use YYYY-MM-DD HH:mm:ss or ISO-8601)';
    }
    return String(Math.floor(date.getTime() / 1000));
}

/**
 * LangChain `convert_unix_time` tool — unix seconds ↔ human-readable UTC.
 *
 * Platform API fields such as `createdAtUnixSeconds` use unix epoch seconds as decimal strings.
 */
export const convertUnixTimeTool: StructuredTool<typeof ConvertUnixTimeInputSchema> = tool(
    convertUnixTimeHandler,
    {
        name: 'convert_unix_time',
        description:
            'Convert between platform unix-seconds strings and human-readable UTC timestamps ' +
            '(YYYY-MM-DD HH:mm:ss). Use unix_to_human when presenting createdAtUnixSeconds / ' +
            'updatedAtUnixSeconds from list_projects, get_cve, etc.',
        schema: ConvertUnixTimeInputSchema,
    },
);
