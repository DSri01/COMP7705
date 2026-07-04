import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProduces,
    ApiTags,
} from '@nestjs/swagger';
import { ApiAgentIdParam } from '../agents/agent-id-api-param.js';
import { ThreadsService } from './threads.service.js';
import {
    CreateThreadResponseDto,
    GetMessagesResponseDto,
    ListThreadsResponseDto,
    PostMessageDto,
    PostMessageResponseDto,
} from './dto/threads.dto.js';

/**
 * REST surface for agent conversation threads (`/agents/:agentId/threads`).
 * Mounted when `AppModule.forDataSource` receives an {@link AgentRegistry}.
 */
@ApiTags('agents')
@Controller('agents/:agentId/threads')
export class ThreadsController {
    constructor(private readonly threadsService: ThreadsService) {}

    @Post()
    @ApiAgentIdParam()
    @ApiOperation({ summary: 'Create a new conversation thread for an agent' })
    @ApiCreatedResponse({ description: 'Thread created', type: CreateThreadResponseDto })
    @ApiNotFoundResponse({ description: 'Unknown agentId' })
    createThread(@Param('agentId') agentId: string): CreateThreadResponseDto {
        return this.threadsService.createThread(agentId);
    }

    @Get()
    @ApiAgentIdParam()
    @ApiOperation({
        summary: 'List threads for an agent',
        description: 'Sorted by createdAt descending (newest first). Ephemeral in-memory registry.',
    })
    @ApiOkResponse({ description: 'Thread summaries', type: ListThreadsResponseDto })
    @ApiNotFoundResponse({ description: 'Unknown agentId' })
    listThreads(@Param('agentId') agentId: string): ListThreadsResponseDto {
        return this.threadsService.listThreads(agentId);
    }

    @Get(':threadId/messages/export')
    @ApiAgentIdParam()
    @Header('Content-Type', 'text/markdown; charset=utf-8')
    @ApiOperation({
        summary: 'Export conversation history as markdown',
        description:
            'Human and assistant turns only (no tool messages). Export timestamp is UTC (ISO-8601 with Z).',
    })
    @ApiParam({
        name: 'threadId',
        description: 'Thread UUID from POST /agents/{agentId}/threads',
    })
    @ApiProduces('text/markdown')
    @ApiOkResponse({
        description: 'Markdown transcript',
        schema: { type: 'string', example: '# Chat export\n\nExported at: 2026-05-30T14:32:00.000Z\n' },
    })
    @ApiNotFoundResponse({ description: 'Unknown agent or thread' })
    exportChatMarkdown(
        @Param('agentId') agentId: string,
        @Param('threadId') threadId: string,
    ): Promise<string> {
        return this.threadsService.exportChatMarkdown(agentId, threadId);
    }

    @Get(':threadId/messages')
    @ApiAgentIdParam()
    @ApiOperation({
        summary: 'Get conversation history for a thread',
        description:
            'Returns human and assistant messages only. Use `messages.length` as the next `newMessageIndex` when posting a message.',
    })
    @ApiParam({
        name: 'threadId',
        description: 'Thread UUID from POST /agents/{agentId}/threads',
    })
    @ApiOkResponse({ description: 'Messages', type: GetMessagesResponseDto })
    @ApiNotFoundResponse({ description: 'Unknown agent or thread' })
    getMessages(
        @Param('agentId') agentId: string,
        @Param('threadId') threadId: string,
    ): Promise<GetMessagesResponseDto> {
        return this.threadsService.getMessages(agentId, threadId);
    }

    @Post(':threadId/messages')
    @ApiAgentIdParam()
    @ApiOperation({
        summary: 'Send a message and receive the assistant reply',
        description:
            'Runs the agent for one turn. `newMessageIndex` must equal the current message count ' +
            '(see GET …/messages). Retrying the same `(agentId, threadId, newMessageIndex)` with the same `message` ' +
            'returns the cached reply without re-invoking the agent.',
    })
    @ApiParam({
        name: 'threadId',
        description: 'Thread UUID from POST /agents/{agentId}/threads',
    })
    @ApiBody({ type: PostMessageDto })
    @ApiOkResponse({
        description: 'Assistant reply with client-aligned message indices',
        type: PostMessageResponseDto,
    })
    @ApiBadRequestResponse({
        description: 'Invalid body or newMessageIndex does not match the next history slot',
    })
    @ApiConflictResponse({
        description: 'newMessageIndex was already used with a different message text',
    })
    @ApiNotFoundResponse({ description: 'Unknown agent or thread' })
    postMessage(
        @Param('agentId') agentId: string,
        @Param('threadId') threadId: string,
        @Body() body: PostMessageDto,
    ): Promise<PostMessageResponseDto> {
        return this.threadsService.postMessage(
            agentId,
            threadId,
            body.message,
            body.newMessageIndex,
        );
    }
}
