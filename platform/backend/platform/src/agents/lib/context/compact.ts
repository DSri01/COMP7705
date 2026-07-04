import type { Logger } from 'pino';
import type { ContextEvent, ContextManagerConfig, ContextSessionState } from './types.js';
import { estimateChars, truncateText } from './truncate.js';

export function formatEventBullet(event: ContextEvent): string {
    const label = event.kind === 'tool' ? `[tool:${event.toolName ?? '?'}]` : '[assistant]';
    const oneLine = event.content.replace(/\s+/g, ' ').trim();
    return `${label} ${oneLine}`;
}

export function foldEventsIntoSummary(
    previousSummary: string,
    events: ContextEvent[],
    summaryMaxChars: number,
): string {
    const bullets = events.map((e) => `- ${formatEventBullet(e)}`);
    const block = bullets.length > 0 ? `Folded tool history:\n${bullets.join('\n')}` : '';
    const merged = [previousSummary.trim(), block.trim()].filter(Boolean).join('\n\n');
    return truncateText(merged, summaryMaxChars).text;
}

export function compactSession(
    state: ContextSessionState,
    config: ContextManagerConfig,
    sizeParts: string[],
    force: boolean,
): { compacted: boolean; foldedCount: number } {
    const estimate = estimateChars(sizeParts);

    if (!force && estimate <= config.compactAboveChars) {
        return { compacted: false, foldedCount: 0 };
    }

    const keep = Math.max(1, config.keepLastEvents);
    const critical = new Set(config.criticalToolNames);
    const isCritical = (e: ContextEvent): boolean =>
        e.kind === 'tool' && !!e.toolName && critical.has(e.toolName);

    const splitAt = Math.max(0, state.recentEvents.length - keep);
    const head = state.recentEvents.slice(0, splitAt);
    const tail = state.recentEvents.slice(splitAt);
    const toFold = head.filter((e) => !isCritical(e));

    if (toFold.length === 0 && !force) {
        return { compacted: false, foldedCount: 0 };
    }

    const foldSet = force ? head.filter((e) => !isCritical(e)) : toFold;
    if (foldSet.length === 0) {
        return { compacted: false, foldedCount: 0 };
    }

    state.summary = foldEventsIntoSummary(state.summary, foldSet, config.summaryMaxChars);
    state.recentEvents = [...head.filter(isCritical), ...tail];
    state.compactCount += 1;

    return { compacted: true, foldedCount: foldSet.length };
}

export function logCompaction(
    logger: Logger,
    meta: { agentId: string; threadId: string },
    state: ContextSessionState,
    foldedCount: number,
    debugLog: boolean,
): void {
    if (!debugLog) {
        return;
    }
    const summaryPreview =
        state.summary.length > 200 ? `…${state.summary.slice(-200)}` : state.summary;
    logger.info(
        {
            ...meta,
            foldedCount,
            recentEvents: state.recentEvents.length,
            summaryChars: state.summary.length,
            compactCount: state.compactCount,
        },
        'session summary compacted',
    );
    logger.debug({ ...meta, summaryPreview }, 'compacted summary tail');
}
