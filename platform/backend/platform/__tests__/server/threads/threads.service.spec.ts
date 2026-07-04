import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { getCurrentTimeUnixSeconds } from '../../../src/utils/time.js';
import { ThreadsService } from '../../../src/server/threads/threads.service.js';

jest.mock('../../../src/utils/time.js', () => ({
    getCurrentTimeUnixSeconds: jest.fn(),
}));

const getCurrentTimeUnixSecondsMock = jest.mocked(getCurrentTimeUnixSeconds);
import {
    AGENT_REGISTRY,
    buildAgentRegistry,
} from '../../../src/server/agents/agent-registry.js';
import type { ThreadedAgent } from '../../../src/server/agents/threaded-agent.js';
import type { AgentId } from '../../../src/agents/manifest.js';

const AGENT_ID: AgentId = 'platform-assistant';
const OTHER_AGENT_ID = 'agent-b';

describe('ThreadsService', () => {
    let service: ThreadsService;

    const agentMock: jest.Mocked<Pick<ThreadedAgent, 'runTurn' | 'getMessages'>> = {
        runTurn: jest.fn<ThreadedAgent['runTurn']>(),
        getMessages: jest.fn<ThreadedAgent['getMessages']>(),
    };

    beforeEach(async () => {
        getCurrentTimeUnixSecondsMock.mockReturnValue(1_746_724_800n);
        const registry = buildAgentRegistry([{ agentId: AGENT_ID, agent: agentMock }]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ThreadsService,
                { provide: AGENT_REGISTRY, useValue: registry },
            ],
        }).compile();

        service = module.get<ThreadsService>(ThreadsService);
        jest.clearAllMocks();
        getCurrentTimeUnixSecondsMock.mockReturnValue(1_746_724_800n);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('createThread() registers a new thread id per agent', () => {
        const first = service.createThread(AGENT_ID);
        const second = service.createThread(AGENT_ID);

        expect(first.threadId).toBeTruthy();
        expect(second.threadId).toBeTruthy();
        expect(first.threadId).not.toBe(second.threadId);

        const listed = service.listThreads(AGENT_ID);
        const ids = listed.threads.map((t) => t.threadId);
        expect(ids).toContain(first.threadId);
        expect(ids).toContain(second.threadId);
    });

    it('listThreads() includes createdAt as unix seconds string', () => {
        getCurrentTimeUnixSecondsMock.mockReturnValue(1_746_724_800n);

        const { threadId } = service.createThread(AGENT_ID);
        const listed = service.listThreads(AGENT_ID);
        const row = listed.threads.find((t) => t.threadId === threadId);

        expect(row).toBeDefined();
        expect(row!.createdAt).toBe('1746724800');
        expect(getCurrentTimeUnixSecondsMock).toHaveBeenCalled();
    });

    it('listThreads() sorts by createdAt descending (newest first)', () => {
        getCurrentTimeUnixSecondsMock.mockReturnValueOnce(1_735_689_600n);
        const older = service.createThread(AGENT_ID);
        getCurrentTimeUnixSecondsMock.mockReturnValueOnce(1_735_776_000n);
        const newer = service.createThread(AGENT_ID);

        const listed = service.listThreads(AGENT_ID);
        expect(listed.threads[0]?.threadId).toBe(newer.threadId);
        expect(listed.threads[1]?.threadId).toBe(older.threadId);
    });

    it('listThreads() returns empty threads before any createThread', () => {
        expect(service.listThreads(AGENT_ID)).toEqual({ threads: [] });
    });

    it('createThread() throws NotFoundException for unknown agent', () => {
        expect(() => service.createThread('unknown-agent')).toThrow(NotFoundException);
    });

    it('getMessages() delegates to agent for registered thread', async () => {
        const { threadId } = service.createThread(AGENT_ID);
        const messages = [
            { role: 'human' as const, content: 'Hi' },
            { role: 'assistant' as const, content: 'Hello' },
        ];
        agentMock.getMessages.mockResolvedValue(messages);

        await expect(service.getMessages(AGENT_ID, threadId)).resolves.toEqual({
            threadId,
            messages,
        });
        expect(agentMock.getMessages).toHaveBeenCalledWith(threadId);
    });

    it('getMessages() throws NotFoundException for unknown thread', async () => {
        await expect(service.getMessages(AGENT_ID, 'unknown-thread')).rejects.toThrow(
            NotFoundException,
        );
        expect(agentMock.getMessages).not.toHaveBeenCalled();
    });

    it('postMessage() delegates to agent and returns reply with indices', async () => {
        const { threadId } = service.createThread(AGENT_ID);
        agentMock.getMessages.mockResolvedValue([]);
        agentMock.runTurn.mockResolvedValue('The answer is 42.');

        await expect(
            service.postMessage(AGENT_ID, threadId, 'What is the meaning of life?', 0),
        ).resolves.toEqual({
            reply: 'The answer is 42.',
            userMessageIndex: 0,
            responseMessageIndex: 1,
        });
        expect(agentMock.getMessages).toHaveBeenCalledWith(threadId);
        expect(agentMock.runTurn).toHaveBeenCalledWith(threadId, 'What is the meaning of life?');
    });

    it('postMessage() requires newMessageIndex to match next history slot', async () => {
        const { threadId } = service.createThread(AGENT_ID);
        agentMock.getMessages.mockResolvedValue([
            { role: 'human', content: 'Hi' },
            { role: 'assistant', content: 'Hello' },
        ]);

        await expect(service.postMessage(AGENT_ID, threadId, 'Next?', 0)).rejects.toThrow(
            BadRequestException,
        );
        expect(agentMock.runTurn).not.toHaveBeenCalled();
    });

    it('postMessage() returns cached reply for duplicate newMessageIndex', async () => {
        const { threadId } = service.createThread(AGENT_ID);
        agentMock.getMessages.mockResolvedValue([]);
        agentMock.runTurn.mockResolvedValue('The answer is 42.');

        const first = await service.postMessage(AGENT_ID, threadId, 'Same question', 0);
        const second = await service.postMessage(AGENT_ID, threadId, 'Same question', 0);

        expect(second).toEqual(first);
        expect(agentMock.runTurn).toHaveBeenCalledTimes(1);
    });

    it('postMessage() throws ConflictException when reusing index with different message', async () => {
        const { threadId } = service.createThread(AGENT_ID);
        agentMock.getMessages.mockResolvedValue([]);
        agentMock.runTurn.mockResolvedValue('42');

        await service.postMessage(AGENT_ID, threadId, 'First text', 0);

        await expect(service.postMessage(AGENT_ID, threadId, 'Different text', 0)).rejects.toThrow(
            ConflictException,
        );
        expect(agentMock.runTurn).toHaveBeenCalledTimes(1);
    });

    it('postMessage() throws NotFoundException for unknown thread', async () => {
        await expect(service.postMessage(AGENT_ID, 'unknown-thread', 'Hi', 0)).rejects.toThrow(
            NotFoundException,
        );
        expect(agentMock.runTurn).not.toHaveBeenCalled();
    });

    it('idempotency cache is scoped per agentId (same index on different agents)', async () => {
        const secondAgent: jest.Mocked<Pick<ThreadedAgent, 'runTurn' | 'getMessages'>> = {
            runTurn: jest.fn<ThreadedAgent['runTurn']>().mockResolvedValue('from-b'),
            getMessages: jest.fn<ThreadedAgent['getMessages']>().mockResolvedValue([]),
        };
        const registry = buildAgentRegistry([
            { agentId: AGENT_ID, agent: agentMock },
            { agentId: OTHER_AGENT_ID, agent: secondAgent },
        ]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [ThreadsService, { provide: AGENT_REGISTRY, useValue: registry }],
        }).compile();
        const scopedService = module.get<ThreadsService>(ThreadsService);

        const { threadId: threadA } = scopedService.createThread(AGENT_ID);
        const { threadId: threadB } = scopedService.createThread(OTHER_AGENT_ID);

        agentMock.getMessages.mockResolvedValue([]);
        agentMock.runTurn.mockResolvedValue('from-a');

        await scopedService.postMessage(AGENT_ID, threadA, 'Q', 0);
        await scopedService.postMessage(OTHER_AGENT_ID, threadB, 'Q', 0);

        expect(agentMock.runTurn).toHaveBeenCalledTimes(1);
        expect(secondAgent.runTurn).toHaveBeenCalledTimes(1);
    });

    it('exportChatMarkdown() delegates to agent and formats transcript', async () => {
        const { threadId } = service.createThread(AGENT_ID);
        const messages = [
            { role: 'human' as const, content: 'Hi' },
            { role: 'assistant' as const, content: 'Hello' },
        ];
        agentMock.getMessages.mockResolvedValue(messages);

        const markdown = await service.exportChatMarkdown(AGENT_ID, threadId);

        expect(agentMock.getMessages).toHaveBeenCalledWith(threadId);
        expect(markdown).toContain('Exported at:');
        expect(markdown).toMatch(/Exported at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
        expect(markdown).toContain('Thread: ' + threadId);
        expect(markdown).toContain('**User**');
        expect(markdown).toContain('Hi');
        expect(markdown).toContain('**Assistant**');
        expect(markdown).toContain('Hello');
    });

    it('exportChatMarkdown() throws NotFoundException for unknown thread', async () => {
        await expect(service.exportChatMarkdown(AGENT_ID, 'unknown-thread')).rejects.toThrow(
            NotFoundException,
        );
        expect(agentMock.getMessages).not.toHaveBeenCalled();
    });
});
