import type { ContextManagerConfig } from './types.js';
import { truncateText } from './truncate.js';

export type ToolTruncatePolicyConfig = Pick<
    ContextManagerConfig,
    'maxEventChars' | 'truncateToolNames' | 'noTruncateToolNames'
>;

/**
 * Whether a tool result should be capped at {@link ContextManagerConfig.maxEventChars}.
 *
 * Priority (first match wins):
 * 1. {@link ContextManagerConfig.noTruncateToolNames} — never truncate these tools.
 * 2. {@link ContextManagerConfig.truncateToolNames} — when set, only truncate tools in this list.
 * 3. Default — truncate all tools not exempted by (1).
 */
export function shouldTruncateToolEvent(
    toolName: string | undefined,
    config: Pick<ContextManagerConfig, 'truncateToolNames' | 'noTruncateToolNames'>,
): boolean {
    const name = toolName ?? '';
    if (config.noTruncateToolNames.includes(name)) {
        return false;
    }
    if (config.truncateToolNames !== undefined) {
        return config.truncateToolNames.includes(name);
    }
    return true;
}

/**
 * Applies per-tool truncation policy to tool result text before storing in the recent window.
 */
export function capToolEventContent(
    raw: string,
    toolName: string | undefined,
    config: ToolTruncatePolicyConfig,
): { text: string; truncated: boolean } {
    if (!shouldTruncateToolEvent(toolName, config)) {
        return { text: raw, truncated: false };
    }
    return truncateText(raw, config.maxEventChars);
}
