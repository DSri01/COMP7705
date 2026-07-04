import { useCallback, useEffect, useRef, useState } from 'react';
import {
    AgentsService,
    type ThreadMessageDto,
    type ThreadSummaryDto,
} from '../../api/generated';
import { getApiErrorMessage } from '../../utils/apiError';
import { downloadAgentChatMarkdown } from '../../utils/downloadAgentChatMarkdown';
import { formatTime, parseUnixSeconds } from '../../utils/time';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';

/** Agent ids from the generated OpenAPI client (`AgentsService` / manifest). */
export type HttpAgentId = Parameters<typeof AgentsService.threadsControllerCreateThread>[0];

/** HTTP agent mounted on the platform (must match the OpenAPI `agentId` union). */
export const HTTP_AGENT_ID = 'platform-assistant' as const satisfies HttpAgentId;

const AGENT_HINT =
    'Platform assistant: CVE triage, research summaries, image-CVE advice, web research, and persistence workflows.';

function isHttpAgentId(value: string): value is HttpAgentId {
    return value === HTTP_AGENT_ID;
}

export interface AgentChatWindowProps {
    agentId: HttpAgentId;
}

/** Per-thread in-memory chat state (cleared on page refresh). */
interface ThreadChatState {
    messages: ThreadMessageDto[];
    messagesLoading: boolean;
    messagesError: string | null;
    /** False until the first GET …/messages for this thread (or create-thread). */
    messagesFetched: boolean;
}

function emptyThreadChatState(messagesFetched = false): ThreadChatState {
    return {
        messages: [],
        messagesLoading: false,
        messagesError: null,
        messagesFetched,
    };
}

export function AgentChatWindow({ agentId }: AgentChatWindowProps) {
    const [threads, setThreads] = useState<ThreadSummaryDto[]>([]);
    const [threadsLoading, setThreadsLoading] = useState(true);
    const [threadsError, setThreadsError] = useState<string | null>(null);

    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    /** Messages per threadId. Drafts live in draftsRef to avoid re-renders while typing. */
    const [chatByThreadId, setChatByThreadId] = useState<Record<string, ThreadChatState>>({});
    const draftsRef = useRef<Record<string, string>>({});
    /** threadIds with an in-flight POST …/messages (other threads stay sendable). */
    const [sendingThreadIds, setSendingThreadIds] = useState<Record<string, true>>({});
    const [downloadingThreadId, setDownloadingThreadId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [creatingThread, setCreatingThread] = useState(false);

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const patchThreadChat = useCallback(
        (threadId: string, patch: Partial<ThreadChatState>) => {
            setChatByThreadId((prev) => ({
                ...prev,
                [threadId]: { ...(prev[threadId] ?? emptyThreadChatState()), ...patch },
            }));
        },
        [],
    );

    const loadThreads = useCallback(() => {
        setThreadsLoading(true);
        setThreadsError(null);
        return AgentsService.threadsControllerListThreads(agentId)
            .then((res) => setThreads(res.threads))
            .catch((err) => setThreadsError(getApiErrorMessage(err)))
            .finally(() => setThreadsLoading(false));
    }, [agentId]);

    useEffect(() => {
        void loadThreads();
    }, [loadThreads]);

    const loadMessages = useCallback(
        (threadId: string) => {
            patchThreadChat(threadId, { messagesLoading: true, messagesError: null });
            return AgentsService.threadsControllerGetMessages(agentId, threadId)
                .then((res) =>
                    patchThreadChat(threadId, {
                        messages: res.messages,
                        messagesLoading: false,
                        messagesFetched: true,
                    }),
                )
                .catch((err) =>
                    patchThreadChat(threadId, {
                        messagesError: getApiErrorMessage(err),
                        messagesLoading: false,
                        messagesFetched: true,
                    }),
                );
        },
        [agentId, patchThreadChat],
    );

    const handleSelectThread = (threadId: string) => {
        setSelectedThreadId(threadId);
        setActionError(null);
        setChatByThreadId((prev) => {
            if (prev[threadId]?.messagesFetched) {
                return prev;
            }
            void loadMessages(threadId);
            return {
                ...prev,
                [threadId]: { ...emptyThreadChatState(), messagesLoading: true },
            };
        });
    };

    const handleCreateThread = () => {
        setCreatingThread(true);
        setActionError(null);
        AgentsService.threadsControllerCreateThread(agentId)
            .then(({ threadId }) => loadThreads().then(() => threadId))
            .then((threadId) => {
                patchThreadChat(threadId, emptyThreadChatState(true));
                setSelectedThreadId(threadId);
            })
            .catch((err) => setActionError(getApiErrorMessage(err)))
            .finally(() => setCreatingThread(false));
    };

    const handleSend = useCallback(
        (text: string): Promise<void> => {
            if (!selectedThreadId) {
                return Promise.resolve();
            }
            const threadId = selectedThreadId;
            const trimmed = text.trim();
            if (!trimmed || sendingThreadIds[threadId]) {
                return Promise.resolve();
            }

            const chat = chatByThreadId[threadId] ?? emptyThreadChatState();
            const newMessageIndex = chat.messages.length;
            setSendingThreadIds((prev) => ({ ...prev, [threadId]: true }));
            setActionError(null);

            return AgentsService.threadsControllerPostMessage(agentId, threadId, {
                message: trimmed,
                newMessageIndex,
            })
                .then(() => loadMessages(threadId))
                .catch((err) => {
                    setActionError(getApiErrorMessage(err));
                    return Promise.reject(err);
                })
                .finally(() => {
                    setSendingThreadIds((prev) => {
                        const next = { ...prev };
                        delete next[threadId];
                        return next;
                    });
                });
        },
        [agentId, chatByThreadId, loadMessages, selectedThreadId, sendingThreadIds],
    );

    const handleDownload = useCallback(() => {
        if (!selectedThreadId || downloadingThreadId !== null) {
            return;
        }
        const threadId = selectedThreadId;
        setDownloadingThreadId(threadId);
        setActionError(null);
        AgentsService.threadsControllerExportChatMarkdown(agentId, threadId)
            .then((markdown) => downloadAgentChatMarkdown(markdown, agentId, threadId))
            .catch((err) => setActionError(getApiErrorMessage(err)))
            .finally(() => setDownloadingThreadId(null));
    }, [agentId, downloadingThreadId, selectedThreadId]);

    const selectedChat = selectedThreadId
        ? (chatByThreadId[selectedThreadId] ?? emptyThreadChatState())
        : emptyThreadChatState();
    const selectedSending = selectedThreadId ? Boolean(sendingThreadIds[selectedThreadId]) : false;
    const selectedDownloading = selectedThreadId !== null && downloadingThreadId === selectedThreadId;

    return (
        <section className="space-y-4">
            <div className="panel">
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-magenta)]">Platform Agent</p>
                <h2 className="mt-1 font-mono text-xl font-semibold text-[var(--text-primary)]">{agentId}</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{AGENT_HINT}</p>
            </div>

            {(threadsError || actionError) && (
                <div className="panel border border-red-500/40 text-sm text-red-300" role="alert">
                    {threadsError ?? actionError}
                </div>
            )}

            <div className="panel flex min-h-[32rem] overflow-hidden p-0">
                <aside
                    className={`flex shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-[width] ${
                        sidebarCollapsed ? 'w-10' : 'w-56'
                    }`}
                >
                    {sidebarCollapsed ? (
                        <button
                            type="button"
                            className="neon-link flex h-full min-h-[8rem] flex-col items-center justify-start px-1 py-3 text-xs"
                            title="Expand threads"
                            onClick={() => setSidebarCollapsed(false)}
                        >
                            <span aria-hidden="true">›</span>
                            <span className="sr-only">Expand threads</span>
                        </button>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                                    Threads
                                </span>
                                <button
                                    type="button"
                                    className="neon-link rounded px-1 text-xs"
                                    title="Collapse threads"
                                    onClick={() => setSidebarCollapsed(true)}
                                >
                                    ‹
                                </button>
                            </div>
                            <div className="border-b border-[var(--border)] p-2">
                                <button
                                    type="button"
                                    className="neon-button w-full text-sm"
                                    disabled={creatingThread}
                                    onClick={handleCreateThread}
                                >
                                    {creatingThread ? 'Creating…' : 'New thread'}
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {threadsLoading && (
                                    <p className="text-xs text-[var(--text-secondary)]">Loading threads…</p>
                                )}
                                {!threadsLoading && threads.length === 0 && (
                                    <p className="text-xs text-[var(--text-secondary)]">No threads yet.</p>
                                )}
                                <ul className="space-y-1">
                                    {threads.map((t) => {
                                        const active = t.threadId === selectedThreadId;
                                        const pending = Boolean(sendingThreadIds[t.threadId]);
                                        const label = formatTime(parseUnixSeconds(t.createdAt));
                                        return (
                                            <li key={t.threadId}>
                                                <button
                                                    type="button"
                                                    className={`w-full rounded-md border px-2 py-1.5 text-left text-xs ${
                                                        active
                                                            ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
                                                            : 'border-[var(--border)] hover:border-[var(--accent-cyan)]/50'
                                                    }`}
                                                    onClick={() => handleSelectThread(t.threadId)}
                                                >
                                                    <span className="flex items-center justify-between gap-1">
                                                        <span className="truncate font-mono text-[10px] text-[var(--text-secondary)]">
                                                            {t.threadId.slice(0, 8)}…
                                                        </span>
                                                        {pending && (
                                                            <span
                                                                className="shrink-0 text-[10px] text-[var(--accent-cyan)]"
                                                                title="Waiting for assistant"
                                                            >
                                                                …
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-[var(--text-primary)]">{label}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </>
                    )}
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    {!selectedThreadId ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                            <p className="text-[var(--text-secondary)]">No thread selected.</p>
                            <button
                                type="button"
                                className="neon-button"
                                disabled={creatingThread}
                                onClick={handleCreateThread}
                            >
                                {creatingThread ? 'Creating…' : 'Create new thread'}
                            </button>
                        </div>
                    ) : (
                        <>
                            <ChatMessageList
                                threadId={selectedThreadId}
                                messages={selectedChat.messages}
                                messagesLoading={selectedChat.messagesLoading}
                                messagesError={selectedChat.messagesError}
                                sending={selectedSending}
                            />
                            <ChatComposer
                                threadId={selectedThreadId}
                                draftsRef={draftsRef}
                                sending={selectedSending}
                                downloading={selectedDownloading}
                                onSend={handleSend}
                                onDownload={handleDownload}
                            />
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

export { isHttpAgentId };
