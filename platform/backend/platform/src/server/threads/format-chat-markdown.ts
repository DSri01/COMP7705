import type { ThreadMessage } from '../agents/threaded-agent.js';

/** Inputs for {@link formatChatMarkdown}. */
export interface FormatChatMarkdownOptions {
    threadId: string;
    messages: ThreadMessage[];
    /** Serialized with {@link Date.toISOString} (UTC). */
    exportedAt: Date;
}

/**
 * Builds a markdown transcript of human and assistant turns only (no tool messages).
 */
export function formatChatMarkdown({ threadId, messages, exportedAt }: FormatChatMarkdownOptions): string {
    const lines: string[] = [
        '# Chat export',
        '',
        `Exported at: ${exportedAt.toISOString()}`,
        `Thread: ${threadId}`,
        '',
    ];

    for (const message of messages) {
        const label = message.role === 'human' ? 'User' : 'Assistant';
        lines.push('---', '', `**${label}**`, '', message.content, '');
    }

    return `${lines.join('\n').trimEnd()}\n`;
}
