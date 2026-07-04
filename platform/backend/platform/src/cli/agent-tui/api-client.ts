import { normalizeAgentsBaseUrl } from './parse-args.js';

/** One message in a thread transcript from the REST API. */
export interface ThreadMessageDto {
    role: 'human' | 'assistant';
    content: string;
}

export interface ThreadSummaryDto {
    threadId: string;
    createdAt: string;
}

export interface ApiErrorBody {
    message?: string | string[];
    statusCode?: number;
    error?: string;
}

/**
 * Thin fetch client for agent thread endpoints under a configurable base URL
 * (e.g. `http://localhost:12080/api/agents` → `…/:agentId/threads`).
 */
export class RestApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = normalizeAgentsBaseUrl(baseUrl);
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    setBaseUrl(baseUrl: string): void {
        this.baseUrl = normalizeAgentsBaseUrl(baseUrl);
    }

    private agentsPath(agentId: string): string {
        return `${this.baseUrl}/${encodeURIComponent(agentId)}/threads`;
    }

    private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
        const init: RequestInit = {
            method,
            headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        };

        const response = await fetch(url, init);
        const text = await response.text();

        if (!response.ok) {
            let detail = text;
            try {
                const parsed = JSON.parse(text) as ApiErrorBody;
                const msg = parsed.message;
                detail = Array.isArray(msg) ? msg.join('; ') : (msg ?? parsed.error ?? text);
            } catch {
                /* use raw text */
            }
            throw new Error(`HTTP ${response.status}: ${detail}`);
        }

        if (response.status === 204 || text.length === 0) {
            return undefined as T;
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
            return JSON.parse(text) as T;
        }

        return text as T;
    }

    createThread(agentId: string): Promise<{ threadId: string }> {
        return this.request('POST', this.agentsPath(agentId));
    }

    listThreads(agentId: string): Promise<{ threads: ThreadSummaryDto[] }> {
        return this.request('GET', this.agentsPath(agentId));
    }

    getMessages(
        agentId: string,
        threadId: string,
    ): Promise<{ threadId: string; messages: ThreadMessageDto[] }> {
        return this.request(
            'GET',
            `${this.agentsPath(agentId)}/${encodeURIComponent(threadId)}/messages`,
        );
    }

    postMessage(
        agentId: string,
        threadId: string,
        message: string,
        newMessageIndex: number,
    ): Promise<{
        reply: string;
        userMessageIndex: number;
        responseMessageIndex: number;
    }> {
        return this.request(
            'POST',
            `${this.agentsPath(agentId)}/${encodeURIComponent(threadId)}/messages`,
            { message, newMessageIndex },
        );
    }

    exportMarkdown(agentId: string, threadId: string): Promise<string> {
        return this.request(
            'GET',
            `${this.agentsPath(agentId)}/${encodeURIComponent(threadId)}/messages/export`,
        );
    }

    /** Returns true if the thread exists for this agent. */
    async threadExists(agentId: string, threadId: string): Promise<boolean> {
        try {
            await this.getMessages(agentId, threadId);
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes('HTTP 404')) {
                return false;
            }
            throw err;
        }
    }
}
