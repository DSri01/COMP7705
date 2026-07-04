import { tool, type StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { AgentContextManager } from './manager.js';
import { sharedResourceStore } from './resource-store.js';
import {
    formatContextLimitsForTools,
    readLimitsFromConfig,
    suggestedReadSliceChars,
} from './config.js';
import { formatGetContextLengthResponse } from './format.js';
import {
    executeReadContextRange,
    formatReadContextRangeResponse,
} from './read-context-range.js';

const readRangeSchema = z
    .object({
        resourceRef: z.string(),
        startChar: z.number().int().min(0).optional(),
        endChar: z.number().int().min(0).optional(),
        startLine: z.number().int().min(1).optional(),
        endLine: z.number().int().min(1).optional(),
    })
    .refine(
        (v) => {
            const hasChar = v.startChar !== undefined && v.endChar !== undefined;
            const hasLine = v.startLine !== undefined && v.endLine !== undefined;
            return (hasChar && !hasLine) || (hasLine && !hasChar);
        },
        { message: 'Provide either startChar+endChar or startLine+endLine, not both.' },
    );

/**
 * LangChain tools for session compaction, working-area edits, and immutable range reads.
 *
 * All numeric limits come from {@link AgentContextManager.config} (e.g. {@link CONSERVATIVE_CONTEXT_CONFIG}
 * wired in `index.ts`). Tool descriptions and read handlers are built at registration time so the
 * model sees the configured `maxReadRangeChars` / `maxEventChars` — nothing is hardcoded in handlers.
 *
 * @param manager - Active {@link AgentContextManager} for the current agent.
 * @returns Tools merged with domain tools in conversational agents; omits `compact_context` when
 *   {@link ContextManagerConfig.allowManualCompact} is false.
 */
export function createContextTools(
    manager: AgentContextManager,
): StructuredTool<z.ZodObject<z.ZodRawShape>>[] {
    const config = manager.config;
    const readLimits = readLimitsFromConfig(config);
    const limitsNote = formatContextLimitsForTools(config);
    const suggestedSlice = suggestedReadSliceChars(config);

    const tools: StructuredTool<z.ZodObject<z.ZodRawShape>>[] = [
        tool(
            async ({ reason }) => {
                const threadId = manager.getActiveThreadId();
                if (!threadId) {
                    return 'No active session for compact_context.';
                }
                const result = manager.compact(threadId, true);
                return result.compacted
                    ? `Compacted ${result.foldedCount} event(s). ${reason ?? ''}`.trim()
                    : `Nothing to compact. ${reason ?? ''}`.trim();
            },
            {
                name: 'compact_context',
                description:
                    'Force-fold older tool history into the session summary. Use when context feels stale or noisy.',
                schema: z.object({
                    reason: z.string().optional().describe('Why you are compacting'),
                }),
            },
        ),
        tool(
            async () => manager.viewWorkingArea(),
            {
                name: 'working_area_view',
                description:
                    'Show the mutable working area (numbered lines). Tool result is capped to maxEventChars; ' +
                    'the full notebook is always in Context: working area on each turn.',
                schema: z.object({}),
            },
        ),
        tool(
            async (input) => {
                const { startLine, endLine } = input as { startLine: number; endLine: number };
                return manager.removeWorkingLines(startLine, endLine);
            },
            {
                name: 'working_area_remove_lines',
                description: 'Remove inclusive line range from the working area (1-based, from working_area_view).',
                schema: z.object({
                    startLine: z.number().int().min(1),
                    endLine: z.number().int().min(1),
                }),
            },
        ),
        tool(
            async (input) => {
                const { startLine, endLine } = input as { startLine: number; endLine: number };
                return manager.keepOnlyWorkingLines(startLine, endLine);
            },
            {
                name: 'working_area_keep_only_lines',
                description:
                    'Keep only the inclusive 1-based line range in the working area; delete all other lines.',
                schema: z.object({
                    startLine: z.number().int().min(1),
                    endLine: z.number().int().min(1),
                }),
            },
        ),
        tool(
            async (input) => {
                const { lines } = input as { lines: string[] };
                return manager.replaceWorkingLines(lines);
            },
            {
                name: 'working_area_replace',
                description:
                    'Replace the entire working-area body with new lines (not append). Use to reset notebook.',
                schema: z.object({
                    lines: z.array(z.string()),
                }),
            },
        ),
        tool(
            async (input) => {
                const { lines } = input as { lines: string[] };
                manager.appendWorkingLines(lines);
                return `Appended ${lines.length} line(s) to working area.`;
            },
            {
                name: 'working_area_append',
                description:
                    `Append excerpt lines to the working area notebook. Required after each read_context_range. ${limitsNote}`,
                schema: z.object({
                    lines: z.array(z.string()).min(1),
                }),
            },
        ),
        tool(
            async (input) => manager.setWorkingSummary((input as { text: string }).text),
            {
                name: 'working_area_set_summary',
                description: 'Set the working area header summary (task notes).',
                schema: z.object({
                    text: z.string(),
                }),
            },
        ),
        tool(
            async (input) => {
                const { resourceRef } = input as { resourceRef: string };
                try {
                    const len = sharedResourceStore.length(resourceRef);
                    const lines = sharedResourceStore.lineCount(resourceRef);
                    return formatGetContextLengthResponse(resourceRef, len, lines, readLimits);
                } catch (err) {
                    return `Error: ${err instanceof Error ? err.message : String(err)}`;
                }
            },
            {
                name: 'get_context_length',
                description:
                    'Get char and line count for an in-memory registered resource ref only (e.g. demo:cve-research-doc). ' +
                    'Do NOT use for web_fetch document ids — use get_cve_research_document instead. ' +
                    `Use before read_context_range to plan slices. ${limitsNote}`,
                schema: z.object({
                    resourceRef: z.string(),
                }),
            },
        ),
        tool(
            async (input) => {
                try {
                    const parsed = readRangeSchema.parse(input);
                    const result = executeReadContextRange(parsed, readLimits);
                    return formatReadContextRangeResponse(result, readLimits);
                } catch (err) {
                    return `Error: ${err instanceof Error ? err.message : String(err)}`;
                }
            },
            {
                name: 'read_context_range',
                description:
                    'Read slice of an in-memory registered resource ref only (e.g. demo:cve-research-doc). ' +
                    'Do NOT use for web_fetch or DB research documents — use get_cve_research_document instead. ' +
                    `Char [startChar,endChar) OR 1-based inclusive lines [startLine,endLine]. ${limitsNote} ` +
                    `The returned JSON is capped to maxEventChars; keep slices ~${suggestedSlice} chars. ` +
                    'Append key facts via working_area_append.',
                schema: readRangeSchema,
            },
        ),
    ];

    if (!manager.config.allowManualCompact) {
        return tools.filter((t) => t.name !== 'compact_context');
    }

    return tools;
}
