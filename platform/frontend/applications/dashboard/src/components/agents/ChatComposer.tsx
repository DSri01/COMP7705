import { useEffect, useState, type RefObject } from 'react';

export type ThreadDraftsRef = RefObject<Record<string, string>>;

export type ChatComposerProps = {
    threadId: string;
    draftsRef: ThreadDraftsRef;
    sending: boolean;
    downloading: boolean;
    onSend: (text: string) => Promise<void>;
    onDownload: () => void;
};

export function ChatComposer({
    threadId,
    draftsRef,
    sending,
    downloading,
    onSend,
    onDownload,
}: ChatComposerProps) {
    const [draft, setDraft] = useState(() => draftsRef.current[threadId] ?? '');

    useEffect(() => {
        setDraft(draftsRef.current[threadId] ?? '');
    }, [threadId, draftsRef]);

    const handleChange = (value: string) => {
        setDraft(value);
        draftsRef.current[threadId] = value;
    };

    const handleSend = () => {
        const text = draft.trim();
        if (!text || sending) {
            return;
        }
        void onSend(text)
            .then(() => {
                draftsRef.current[threadId] = '';
                setDraft('');
            })
            .catch(() => {
                /* parent surfaces error; keep draft */
            });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const canSend = Boolean(draft.trim() && !sending);
    const canDownload = !sending && !downloading;

    return (
        <div className="border-t border-[var(--border)] p-4">
            <textarea
                className="w-full resize-y rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-cyan)]"
                rows={3}
                placeholder="Message the agent…"
                value={draft}
                disabled={sending}
                onChange={(e) => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Enter to send · Shift+Enter for a new line
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="neon-button" disabled={!canDownload} onClick={onDownload}>
                    {downloading ? 'Downloading…' : 'Download Transcript'}
                </button>
                <button type="button" className="neon-button" disabled={!canSend} onClick={handleSend}>
                    {sending ? 'Sending…' : 'Send'}
                </button>
            </div>
        </div>
    );
}
