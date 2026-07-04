import { describe, it, expect } from '@jest/globals';

import { formatChatMarkdown } from '../../../src/server/threads/format-chat-markdown.js';

describe('formatChatMarkdown', () => {
    const exportedAt = new Date('2026-05-30T14:32:00.000Z');

    it('includes UTC export header and thread id', () => {
        const markdown = formatChatMarkdown({
            threadId: 'thread-abc',
            messages: [],
            exportedAt,
        });

        expect(markdown).toContain('# Chat export');
        expect(markdown).toContain('Exported at: 2026-05-30T14:32:00.000Z');
        expect(markdown).toContain('Thread: thread-abc');
    });

    it('formats human and assistant messages with horizontal rules after each', () => {
        const markdown = formatChatMarkdown({
            threadId: 'thread-1',
            messages: [
                { role: 'human', content: 'What is 6 * 7?' },
                { role: 'assistant', content: '42' },
            ],
            exportedAt,
        });

        expect(markdown).toBe(
            [
                '# Chat export',
                '',
                'Exported at: 2026-05-30T14:32:00.000Z',
                'Thread: thread-1',
                '',
                '---',
                '',
                '**User**',
                '',
                'What is 6 * 7?',
                '',
                '---',
                '',
                '**Assistant**',
                '',
                '42',
                '',
            ].join('\n'),
        );
    });

    it('ends with a trailing newline', () => {
        const markdown = formatChatMarkdown({
            threadId: 't',
            messages: [{ role: 'human', content: 'Hi' }],
            exportedAt,
        });

        expect(markdown.endsWith('\n')).toBe(true);
    });
});
