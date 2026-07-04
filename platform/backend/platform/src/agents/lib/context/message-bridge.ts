import { AIMessage, BaseMessage, ToolMessage } from '@langchain/core/messages';
import type { Logger } from 'pino';
import type { ContextEvent, ContextManagerConfig } from './types.js';
import type { ToolTruncatePolicyConfig } from './truncate-policy.js';
import { capToolEventContent } from './truncate-policy.js';
import { truncateText } from './truncate.js';

export function messageToEvents(
    messages: BaseMessage[],
    config: ToolTruncatePolicyConfig,
): { events: ContextEvent[]; truncatedToolCount: number } {
    const events: ContextEvent[] = [];
    let truncatedToolCount = 0;
    for (const message of messages) {
        if (message instanceof AIMessage) {
            const raw =
                typeof message.content === 'string'
                    ? message.content
                    : JSON.stringify(message.content);
            const toolNames = message.tool_calls?.map((c) => c.name).join(', ') ?? '';
            const content = toolNames ? `[tool_calls: ${toolNames}] ${raw}` : raw;
            const { text } = truncateText(content, config.maxEventChars);
            events.push({ kind: 'ai', content: text, recordedAt: new Date().toISOString() });
            continue;
        }
        if (message instanceof ToolMessage) {
            const raw =
                typeof message.content === 'string'
                    ? message.content
                    : JSON.stringify(message.content);
            const { text, truncated } = capToolEventContent(raw, message.name, config);
            if (truncated) {
                truncatedToolCount += 1;
            }
            events.push({
                kind: 'tool',
                toolName: message.name,
                content: text,
                recordedAt: new Date().toISOString(),
            });
        }
    }
    return { events, truncatedToolCount };
}

export function eventsToMessages(events: ContextEvent[]): BaseMessage[] {
    const messages: BaseMessage[] = [];
    for (const event of events) {
        if (event.kind === 'ai') {
            messages.push(new AIMessage(event.content));
            continue;
        }
        messages.push(
            new ToolMessage({
                content: event.content,
                tool_call_id: `ctx-${event.recordedAt}`,
                name: event.toolName ?? 'tool',
            }),
        );
    }
    return messages;
}

export function logAiToolCalls(
    logger: Logger,
    meta: { agentId: string; threadId: string },
    messages: BaseMessage[],
    debugLog: boolean,
): void {
    if (!debugLog) {
        return;
    }
    for (const message of messages) {
        if (!(message instanceof AIMessage)) {
            continue;
        }
        const names = message.tool_calls?.map((c) => c.name).filter(Boolean) ?? [];
        if (names.length > 0) {
            logger.info({ ...meta, toolCalls: names }, 'tool_actor requested tools');
        }
    }
}

export function logToolIngestFromMessages(
    logger: Logger,
    meta: { agentId: string; threadId: string },
    messages: BaseMessage[],
    config: ContextManagerConfig,
): void {
    if (!config.debugLog) {
        return;
    }
    for (const message of messages) {
        if (!(message instanceof ToolMessage)) {
            continue;
        }
        const raw =
            typeof message.content === 'string'
                ? message.content
                : JSON.stringify(message.content);
        const { text, truncated } = capToolEventContent(raw, message.name, config);
        logger.debug(
            {
                ...meta,
                toolName: message.name ?? '?',
                rawChars: raw.length,
                storedChars: text.length,
                truncated,
                maxEventChars: config.maxEventChars,
            },
            'tool result ingested',
        );
        if (truncated) {
            logger.warn(
                { ...meta, toolName: message.name ?? '?', rawChars: raw.length, maxEventChars: config.maxEventChars },
                'tool result truncated on ingest',
            );
        }
    }
}
