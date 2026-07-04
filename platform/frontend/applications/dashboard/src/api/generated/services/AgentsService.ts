/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateThreadResponseDto } from '../models/CreateThreadResponseDto';
import type { GetMessagesResponseDto } from '../models/GetMessagesResponseDto';
import type { ListThreadsResponseDto } from '../models/ListThreadsResponseDto';
import type { PostMessageDto } from '../models/PostMessageDto';
import type { PostMessageResponseDto } from '../models/PostMessageResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AgentsService {
    /**
     * Create a new conversation thread for an agent
     * @param agentId Registered HTTP agent id (see src/agents/manifest.ts)
     * @returns CreateThreadResponseDto Thread created
     * @throws ApiError
     */
    public static threadsControllerCreateThread(
        agentId: 'platform-assistant',
    ): CancelablePromise<CreateThreadResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/agents/{agentId}/threads',
            path: {
                'agentId': agentId,
            },
            errors: {
                404: `Unknown agentId`,
            },
        });
    }
    /**
     * List threads for an agent
     * Sorted by createdAt descending (newest first). Ephemeral in-memory registry.
     * @param agentId Registered HTTP agent id (see src/agents/manifest.ts)
     * @returns ListThreadsResponseDto Thread summaries
     * @throws ApiError
     */
    public static threadsControllerListThreads(
        agentId: 'platform-assistant',
    ): CancelablePromise<ListThreadsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/agents/{agentId}/threads',
            path: {
                'agentId': agentId,
            },
            errors: {
                404: `Unknown agentId`,
            },
        });
    }
    /**
     * Export conversation history as markdown
     * Human and assistant turns only (no tool messages). Export timestamp is UTC (ISO-8601 with Z).
     * @param agentId Registered HTTP agent id (see src/agents/manifest.ts)
     * @param threadId Thread UUID from POST /agents/{agentId}/threads
     * @returns string Markdown transcript
     * @throws ApiError
     */
    public static threadsControllerExportChatMarkdown(
        agentId: 'platform-assistant',
        threadId: string,
    ): CancelablePromise<string> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/agents/{agentId}/threads/{threadId}/messages/export',
            path: {
                'agentId': agentId,
                'threadId': threadId,
            },
            errors: {
                404: `Unknown agent or thread`,
            },
        });
    }
    /**
     * Get conversation history for a thread
     * Returns human and assistant messages only. Use `messages.length` as the next `newMessageIndex` when posting a message.
     * @param agentId Registered HTTP agent id (see src/agents/manifest.ts)
     * @param threadId Thread UUID from POST /agents/{agentId}/threads
     * @returns GetMessagesResponseDto Messages
     * @throws ApiError
     */
    public static threadsControllerGetMessages(
        agentId: 'platform-assistant',
        threadId: string,
    ): CancelablePromise<GetMessagesResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/agents/{agentId}/threads/{threadId}/messages',
            path: {
                'agentId': agentId,
                'threadId': threadId,
            },
            errors: {
                404: `Unknown agent or thread`,
            },
        });
    }
    /**
     * Send a message and receive the assistant reply
     * Runs the agent for one turn. `newMessageIndex` must equal the current message count (see GET …/messages). Retrying the same `(agentId, threadId, newMessageIndex)` with the same `message` returns the cached reply without re-invoking the agent.
     * @param agentId Registered HTTP agent id (see src/agents/manifest.ts)
     * @param threadId Thread UUID from POST /agents/{agentId}/threads
     * @param requestBody
     * @returns PostMessageResponseDto Assistant reply with client-aligned message indices
     * @throws ApiError
     */
    public static threadsControllerPostMessage(
        agentId: 'platform-assistant',
        threadId: string,
        requestBody: PostMessageDto,
    ): CancelablePromise<PostMessageResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/agents/{agentId}/threads/{threadId}/messages',
            path: {
                'agentId': agentId,
                'threadId': threadId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid body or newMessageIndex does not match the next history slot`,
                404: `Unknown agent or thread`,
                409: `newMessageIndex was already used with a different message text`,
            },
        });
    }
}
