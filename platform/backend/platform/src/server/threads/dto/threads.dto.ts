import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

/** Request/response DTOs for `/agents/:agentId/threads` (OpenAPI + validation). */

export class ThreadMessageDto {
    @ApiProperty({ enum: ['human', 'assistant'], example: 'human' })
    role!: 'human' | 'assistant';

    @ApiProperty({ example: 'What is 12 * 3?' })
    content!: string;
}

export class CreateThreadResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    threadId!: string;
}

/** One row in GET …/threads (platform shape; includes creation time). */
export class ThreadSummaryDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    threadId!: string;

    @ApiProperty({
        example: '1735689600',
        description: 'Thread creation time as Unix seconds (int64 string), platform API convention',
    })
    createdAt!: string;
}

export class ListThreadsResponseDto {
    @ApiProperty({ type: [ThreadSummaryDto] })
    threads!: ThreadSummaryDto[];
}

export class GetMessagesResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    threadId!: string;

    @ApiProperty({ type: [ThreadMessageDto] })
    messages!: ThreadMessageDto[];
}

export class PostMessageDto {
    @ApiProperty({
        example: 'What is the average of 14, 52 and 64?',
        description: 'User message text for this turn.',
        required: true,
    })
    @IsString()
    @MinLength(1)
    message!: string;

    @ApiProperty({
        example: 0,
        description:
            'Client-assigned index for this human message in the chat list. Must equal `messages.length` from GET …/messages. Retries with the same index and message return the cached reply.',
        required: true,
        minimum: 0,
    })
    @IsInt()
    @Min(0)
    newMessageIndex!: number;
}

export class PostMessageResponseDto {
    @ApiProperty({
        example: '12 * 3 equals 36.',
        description: 'Final assistant reply for this turn.',
        required: true,
    })
    reply!: string;

    @ApiProperty({
        example: 0,
        description: 'Index of the human message for this turn (same as request newMessageIndex).',
        required: true,
        minimum: 0,
    })
    userMessageIndex!: number;

    @ApiProperty({
        example: 1,
        description: 'Index of the assistant reply (typically userMessageIndex + 1).',
        required: true,
        minimum: 0,
    })
    responseMessageIndex!: number;
}
