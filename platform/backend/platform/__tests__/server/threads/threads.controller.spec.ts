import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';

import { ThreadsController } from '../../../src/server/threads/threads.controller.js';
import { ThreadsService } from '../../../src/server/threads/threads.service.js';

const AGENT_ID = 'platform-assistant';

describe('ThreadsController', () => {
    let controller: ThreadsController;

    type ThreadsServiceMock = Pick<
        jest.Mocked<ThreadsService>,
        'createThread' | 'listThreads' | 'getMessages' | 'postMessage' | 'exportChatMarkdown'
    >;

    const threadsServiceMock: ThreadsServiceMock = {
        createThread: jest.fn<ThreadsService['createThread']>(),
        listThreads: jest.fn<ThreadsService['listThreads']>(),
        getMessages: jest.fn<ThreadsService['getMessages']>(),
        postMessage: jest.fn<ThreadsService['postMessage']>(),
        exportChatMarkdown: jest.fn<ThreadsService['exportChatMarkdown']>(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ThreadsController],
            providers: [{ provide: ThreadsService, useValue: threadsServiceMock }],
        }).compile();

        controller = module.get<ThreadsController>(ThreadsController);
        jest.clearAllMocks();
    });

    it('createThread() delegates to service with agentId', () => {
        threadsServiceMock.createThread.mockReturnValue({ threadId: 'thread-1' });

        expect(controller.createThread(AGENT_ID)).toEqual({ threadId: 'thread-1' });
        expect(threadsServiceMock.createThread).toHaveBeenCalledWith(AGENT_ID);
    });

    it('listThreads() delegates to service with agentId', () => {
        const response = {
            threads: [{ threadId: 'a', createdAt: '1735689600' }],
        };
        threadsServiceMock.listThreads.mockReturnValue(response);

        expect(controller.listThreads(AGENT_ID)).toEqual(response);
        expect(threadsServiceMock.listThreads).toHaveBeenCalledWith(AGENT_ID);
    });

    it('getMessages() delegates to service', async () => {
        const response = {
            threadId: 'thread-1',
            messages: [{ role: 'human' as const, content: 'Hi' }],
        };
        threadsServiceMock.getMessages.mockResolvedValue(response);

        await expect(controller.getMessages(AGENT_ID, 'thread-1')).resolves.toEqual(response);
        expect(threadsServiceMock.getMessages).toHaveBeenCalledWith(AGENT_ID, 'thread-1');
    });

    it('postMessage() delegates to service with body message and newMessageIndex', async () => {
        threadsServiceMock.postMessage.mockResolvedValue({
            reply: '42',
            userMessageIndex: 2,
            responseMessageIndex: 3,
        });

        await expect(
            controller.postMessage(AGENT_ID, 'thread-1', {
                message: 'What is 6 * 7?',
                newMessageIndex: 2,
            }),
        ).resolves.toEqual({
            reply: '42',
            userMessageIndex: 2,
            responseMessageIndex: 3,
        });
        expect(threadsServiceMock.postMessage).toHaveBeenCalledWith(
            AGENT_ID,
            'thread-1',
            'What is 6 * 7?',
            2,
        );
    });

    it('getMessages() propagates NotFoundException from service', async () => {
        const err = new NotFoundException('Thread not found');
        threadsServiceMock.getMessages.mockRejectedValue(err);

        await expect(controller.getMessages(AGENT_ID, 'missing')).rejects.toBe(err);
    });

    it('exportChatMarkdown() delegates to service', async () => {
        const markdown = '# Chat export\n';
        threadsServiceMock.exportChatMarkdown.mockResolvedValue(markdown);

        await expect(controller.exportChatMarkdown(AGENT_ID, 'thread-1')).resolves.toBe(markdown);
        expect(threadsServiceMock.exportChatMarkdown).toHaveBeenCalledWith(AGENT_ID, 'thread-1');
    });
});
