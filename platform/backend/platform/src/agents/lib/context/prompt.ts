import type { ContextManagerConfig, ContextPromptSections, ContextSessionState } from './types.js';
import { truncateText } from './truncate.js';

export const PROMPT_SECTION_HEADERS = {
    pinned: '=== Context: pinned ===',
    workingArea: '=== Context: working area ===',
    sessionSummary: '=== Context: session summary (compressed older tool history) ===',
    limits: '=== Context: limits ===',
    stats: '=== Context: stats ===',
} as const;

export function formatWorkingAreaBody(state: ContextSessionState): string {
    const workingBody = state.workingAreaLines
        .map((line, index) => `${index + 1}. ${line}`)
        .join('\n');
    return [state.workingAreaHeader.trim(), workingBody.trim() || '(empty)']
        .filter(Boolean)
        .join('\n\n');
}

export function buildContextPromptSections(
    state: ContextSessionState,
    config: ContextManagerConfig,
    pinnedLines: string[] = [],
): ContextPromptSections {
    return {
        pinned: pinnedLines.filter(Boolean).join('\n'),
        workingArea: formatWorkingAreaBody(state),
        sessionSummary: state.summary.trim() || '(none yet)',
        limitsLine:
            `maxReadRangeChars=${config.maxReadRangeChars} maxEventChars=${config.maxEventChars} ` +
            `workingAreaMaxChars=${config.workingAreaMaxChars} compactAboveChars=${config.compactAboveChars} ` +
            `keepLastEvents=${config.keepLastEvents}`,
        statsLine:
            `recentEvents=${state.recentEvents.length} compactions=${state.compactCount} ` +
            `truncations=${state.truncateCount}`,
    };
}

export function appendContextToPrompt(basePrompt: string, sections: ContextPromptSections): string {
    const h = PROMPT_SECTION_HEADERS;
    return [
        basePrompt,
        '',
        h.pinned,
        sections.pinned || '(none)',
        '',
        h.workingArea,
        sections.workingArea,
        '',
        h.sessionSummary,
        sections.sessionSummary,
        '',
        h.limits,
        sections.limitsLine,
        '',
        h.stats,
        sections.statsLine,
    ].join('\n');
}

function clampWorkingLines(lines: string[], maxChars: number): string[] {
    return truncateText(lines.join('\n'), maxChars).text.split('\n').filter((l) => l.length > 0);
}

export function appendWorkingLines(
    state: ContextSessionState,
    config: ContextManagerConfig,
    lines: string[],
): void {
    const merged = [...state.workingAreaLines, ...lines.filter((l) => l.length > 0)];
    state.workingAreaLines = clampWorkingLines(merged, config.workingAreaMaxChars);
}

export function keepOnlyWorkingLines(
    state: ContextSessionState,
    startLine: number,
    endLine: number,
): string {
    const start = Math.max(1, startLine);
    const end = Math.min(state.workingAreaLines.length, endLine);
    if (start > end || state.workingAreaLines.length === 0) {
        return 'No lines kept (invalid range or empty working area).';
    }
    const kept = state.workingAreaLines.slice(start - 1, end);
    state.workingAreaLines = kept;
    return `Kept lines ${start}-${end} (${kept.length} line(s)).`;
}

export function replaceWorkingLines(
    state: ContextSessionState,
    config: ContextManagerConfig,
    lines: string[],
): string {
    const filtered = lines.filter((l) => l.length > 0);
    state.workingAreaLines = clampWorkingLines(filtered, config.workingAreaMaxChars);
    return `Replaced working area with ${state.workingAreaLines.length} line(s).`;
}

export function removeWorkingLines(
    state: ContextSessionState,
    startLine: number,
    endLine: number,
): string {
    const start = Math.max(1, startLine);
    const end = Math.min(state.workingAreaLines.length, endLine);
    if (start > end || state.workingAreaLines.length === 0) {
        return 'No lines removed (invalid range or empty working area).';
    }
    const removed = state.workingAreaLines.splice(start - 1, end - start + 1);
    return `Removed lines ${start}-${end}: ${removed.join(' | ')}`;
}

export function setWorkingSummary(
    state: ContextSessionState,
    config: ContextManagerConfig,
    text: string,
): string {
    state.workingAreaHeader = truncateText(text, Math.min(300, config.workingAreaMaxChars)).text;
    return 'Working area summary updated.';
}
