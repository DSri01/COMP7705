import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AGENT_REGISTRY, type AgentRegistry } from '../agents/agent-registry.js';
import type { ThreadedAgent } from '../agents/threaded-agent.js';
import { formatChatMarkdown } from './format-chat-markdown.js';
import type {
    CreateThreadResponseDto,
    GetMessagesResponseDto,
    ListThreadsResponseDto,
    PostMessageResponseDto,
    ThreadMessageDto,
    ThreadSummaryDto,
} from './dto/threads.dto.js';
import {
    turnCacheKey,
    type CompletedTurnRecord,
} from './turn-idempotency.js';
import { getCurrentTimeUnixSeconds } from '../../utils/time.js';

/** In-memory metadata for a thread created via POST …/threads. */
interface ThreadRecord {
    threadId: string;
    /** Unix seconds as int64 string (platform API convention). */
    createdAt: string;
}

/**
 * Thread registry, idempotent message posting, and delegation to {@link ThreadedAgent}.
 * Ephemeral per process (not persisted to PostgreSQL).
 */
@Injectable()
export class ThreadsService {
    private readonly threadRegistry = new Map<string, Map<string, ThreadRecord>>();
    private readonly completedTurns = new Map<string, CompletedTurnRecord>();
    private readonly inFlightTurns = new Map<string, Promise<CompletedTurnRecord>>();

    constructor(@Inject(AGENT_REGISTRY) private readonly agentRegistry: AgentRegistry) {}

    /** Registers a new thread id for `agentId`. @throws {NotFoundException} for unknown agent */
    createThread(agentId: string): CreateThreadResponseDto {
        this.agentRegistry.resolve(agentId);
        const threadId = randomUUID();
        this.registerThread(agentId, threadId);
        return { threadId };
    }

    /** Lists threads for `agentId`, newest {@link ThreadSummaryDto.createdAt} first. */
    listThreads(agentId: string): ListThreadsResponseDto {
        this.agentRegistry.resolve(agentId);
        const threads = this.threadRegistry.get(agentId);
        if (!threads) {
            return { threads: [] };
        }

        const summaries: ThreadSummaryDto[] = Array.from(threads.values());
        summaries.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        return { threads: summaries };
    }

    private registerThread(agentId: string, threadId: string): void {
        let threads = this.threadRegistry.get(agentId);
        if (!threads) {
            threads = new Map();
            this.threadRegistry.set(agentId, threads);
        }

        const createdAt = getCurrentTimeUnixSeconds().toString();
        threads.set(threadId, { threadId, createdAt });
    }

    private assertThreadExists(agentId: string, threadId: string): void {
        this.agentRegistry.resolve(agentId);
        const threads = this.threadRegistry.get(agentId);
        if (!threads?.has(threadId)) {
            throw new NotFoundException('Thread not found');
        }
    }

    async getMessages(agentId: string, threadId: string): Promise<GetMessagesResponseDto> {
        this.assertThreadExists(agentId, threadId);
        const agent = this.agentRegistry.resolve(agentId);
        const messages: ThreadMessageDto[] = await agent.getMessages(threadId);
        return { threadId, messages };
    }

    async postMessage(
        agentId: string,
        threadId: string,
        message: string,
        newMessageIndex: number,
    ): Promise<PostMessageResponseDto> {
        this.assertThreadExists(agentId, threadId);
        const agent = this.agentRegistry.resolve(agentId);

        const key = turnCacheKey(agentId, threadId, newMessageIndex);
        const cached = this.completedTurns.get(key);
        if (cached) {
            if (cached.message !== message) {
                throw new ConflictException(
                    'new_message_index was already used with a different message',
                );
            }
            return this.toPostMessageResponse(cached);
        }

        const inFlight = this.inFlightTurns.get(key);
        if (inFlight) {
            const result = await inFlight;
            if (result.message !== message) {
                throw new ConflictException(
                    'new_message_index was already used with a different message',
                );
            }
            return this.toPostMessageResponse(result);
        }

        const runPromise = this.runNewTurn(agent, threadId, message, newMessageIndex);
        this.inFlightTurns.set(key, runPromise);

        try {
            const record = await runPromise;
            this.completedTurns.set(key, record);
            return this.toPostMessageResponse(record);
        } finally {
            this.inFlightTurns.delete(key);
        }
    }

    private async runNewTurn(
        agent: ThreadedAgent,
        threadId: string,
        message: string,
        newMessageIndex: number,
    ): Promise<CompletedTurnRecord> {
        const messages = await agent.getMessages(threadId);
        const expectedIndex = messages.length;
        if (newMessageIndex !== expectedIndex) {
            throw new BadRequestException(
                `newMessageIndex must be ${expectedIndex} (next slot in thread history), got ${newMessageIndex}`,
            );
        }

        const reply = await agent.runTurn(threadId, message);
        const userMessageIndex = newMessageIndex;
        const responseMessageIndex = newMessageIndex + 1;

        return {
            message,
            reply,
            userMessageIndex,
            responseMessageIndex,
        };
    }

    private toPostMessageResponse(record: CompletedTurnRecord): PostMessageResponseDto {
        return {
            reply: record.reply,
            userMessageIndex: record.userMessageIndex,
            responseMessageIndex: record.responseMessageIndex,
        };
    }

    async exportChatMarkdown(agentId: string, threadId: string): Promise<string> {
        this.assertThreadExists(agentId, threadId);
        const agent = this.agentRegistry.resolve(agentId);
        const messages = await agent.getMessages(threadId);
        return formatChatMarkdown({ threadId, messages, exportedAt: new Date() });
    }
}
