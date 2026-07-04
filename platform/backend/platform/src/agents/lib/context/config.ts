/**
 * Context limit presets and platform budget derivation.
 *
 * {@link CONSERVATIVE_CONTEXT_CONFIG} — small limits for manual QA.
 * {@link PLATFORM_CONTEXT_CONFIG} — char budgets from 128K window × 0.8 usable × 0.6 tokens/char.
 * Shared policy (critical/truncate tool lists, debugLog) is spread into both presets;
 * override per agent at `createAgentContextManager`.
 */
import type { ContextManagerConfig } from './types.js';

/** Tools whose results may be truncated when stored in the recent window (`finish` is exempt). */
const CONTEXT_TRUNCATE_TOOL_NAMES = [
    'calculate',
    'get_cve',
    'get_current_time',
    'list_documents',
    'read_context_range',
    'get_context_length',
    'compact_context',
    'working_area_view',
    'working_area_remove_lines',
    'working_area_keep_only_lines',
    'working_area_replace',
    'working_area_append',
    'working_area_set_summary',
] as const;

const CONTEXT_POLICY = {
    allowManualCompact: true,
    /** Per-agent overrides common (e.g. sea-creature adds `list_documents`). */
    criticalToolNames: ['finish'],
    noTruncateToolNames: ['finish'],
    truncateToolNames: [...CONTEXT_TRUNCATE_TOOL_NAMES],
    debugLog: true,
} as const satisfies Partial<ContextManagerConfig>;

/**
 * Default limits for server/CLI manual QA. Tool descriptions and formatters read the same numbers.
 *
 * Swap to {@link PLATFORM_CONTEXT_CONFIG} in `index.ts` for production-scale soak tests.
 */
export const CONSERVATIVE_CONTEXT_CONFIG: ContextManagerConfig = {
    keepLastEvents: 4,
    compactAboveChars: 3_500,
    summaryMaxChars: 800,
    maxEventChars: 512,
    maxReadRangeChars: 400,
    workingAreaMaxChars: 1_200,
    ...CONTEXT_POLICY,
};

// --- Platform budget (128K window, 80% usable, 0.6 tokens/char) ---

export const MAX_CONTEXT_WINDOW_LENGTH = 128_000;
export const TOKENS_PER_CHAR = 0.6;
export const USABLE_CONTEXT_TOKEN_FRACTION = 0.8;
export const USABLE_CONTEXT_TOKEN_LENGTH = Math.floor(
    MAX_CONTEXT_WINDOW_LENGTH * USABLE_CONTEXT_TOKEN_FRACTION,
);

export function usableContextCharBudget(): number {
    return Math.floor(USABLE_CONTEXT_TOKEN_LENGTH / TOKENS_PER_CHAR);
}

export const COMPACT_ABOVE_CHARS_FRACTION = 0.47;
export const WORKING_AREA_MAX_CHARS_FRACTION = 0.12;
export const SUMMARY_MAX_CHARS_FRACTION = 0.08;
export const MAX_READ_RANGE_CHARS_FRACTION = 0.14;
export const MAX_EVENT_CHARS_READ_SLACK = 4_000;
export const KEEP_LAST_EVENTS = 14;

/** @param overrides - Optional per-field overrides for tests or env-specific tuning. */
export function derivePlatformContextConfig(
    overrides: Partial<ContextManagerConfig> = {},
): ContextManagerConfig {
    const usable = usableContextCharBudget();
    const maxReadRangeChars = Math.floor(usable * MAX_READ_RANGE_CHARS_FRACTION);

    return {
        keepLastEvents: KEEP_LAST_EVENTS,
        compactAboveChars: Math.floor(usable * COMPACT_ABOVE_CHARS_FRACTION),
        summaryMaxChars: Math.floor(usable * SUMMARY_MAX_CHARS_FRACTION),
        maxReadRangeChars,
        maxEventChars: maxReadRangeChars + MAX_EVENT_CHARS_READ_SLACK,
        workingAreaMaxChars: Math.floor(usable * WORKING_AREA_MAX_CHARS_FRACTION),
        ...CONTEXT_POLICY,
        ...overrides,
    };
}

/** Production-scale limits for CVE / document agents (derived from constants above). */
export const PLATFORM_CONTEXT_CONFIG = derivePlatformContextConfig();

// --- Limit helpers (tool descriptions, read/format handlers) ---

export type ContextLimitsSnapshot = Pick<ContextManagerConfig, 'maxReadRangeChars' | 'maxEventChars'>;

export function readLimitsFromConfig(config: ContextManagerConfig): ContextLimitsSnapshot {
    return {
        maxReadRangeChars: config.maxReadRangeChars,
        maxEventChars: config.maxEventChars,
    };
}

export function suggestedReadSliceChars(config: ContextManagerConfig): number {
    return Math.max(40, Math.floor(config.maxReadRangeChars * 0.5));
}

export function formatContextLimitsForTools(config: ContextManagerConfig): string {
    return (
        `Configured limits: maxReadRangeChars=${config.maxReadRangeChars} (read body), ` +
        `maxEventChars=${config.maxEventChars} (full tool result stored in transcript; may truncate if exceeded).`
    );
}
