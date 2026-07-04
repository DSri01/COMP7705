import { memo } from 'react';
import type { ThreadMessageDto } from '../../api/generated';
import { SafeMarkdown } from '../markdown/SafeMarkdown';

export type ChatMessageItemProps = {
    message: ThreadMessageDto;
};

export const ChatMessageItem = memo(function ChatMessageItem({ message }: ChatMessageItemProps) {
    return (
        <li
            className={`rounded-md border px-3 py-2 text-sm ${
                message.role === 'human'
                    ? 'ml-8 border-[var(--accent-cyan)]/40 bg-[var(--accent-cyan)]/5'
                    : 'mr-8 border-[var(--accent-magenta)]/40 bg-[var(--accent-magenta)]/5'
            }`}
        >
            <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
                {message.role === 'human' ? 'You' : 'Assistant'}
            </p>
            <SafeMarkdown content={message.content} />
        </li>
    );
});
