import { memo } from 'react';
import type { ThreadMessageDto } from '../../api/generated';
import { ChatMessageItem } from './ChatMessageItem';

export type ChatMessageListProps = {
    threadId: string;
    messages: ThreadMessageDto[];
    messagesLoading: boolean;
    messagesError: string | null;
    sending: boolean;
};

export const ChatMessageList = memo(function ChatMessageList({
    threadId,
    messages,
    messagesLoading,
    messagesError,
    sending,
}: ChatMessageListProps) {
    return (
        <div className="flex-1 overflow-y-auto p-4">
            {messagesLoading && (
                <p className="text-sm text-[var(--text-secondary)]">Loading messages…</p>
            )}
            {messagesError && (
                <p className="text-sm text-red-300" role="alert">
                    {messagesError}
                </p>
            )}
            {!messagesLoading && !messagesError && messages.length === 0 && (
                <p className="text-sm text-[var(--text-secondary)]">
                    No messages in this thread yet. Send one below.
                </p>
            )}
            <ul className="space-y-3">
                {messages.map((message, index) => (
                    <ChatMessageItem key={`${threadId}-${index}`} message={message} />
                ))}
            </ul>
            {sending && (
                <p className="mt-4 text-sm text-[var(--accent-cyan)]" aria-live="polite">
                    Waiting for assistant…
                </p>
            )}
        </div>
    );
});
