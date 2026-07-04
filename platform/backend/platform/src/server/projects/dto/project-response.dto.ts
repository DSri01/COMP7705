import { ApiProperty } from "@nestjs/swagger";

export class ProjectResponseDto {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
    id!: string;

    @ApiProperty({ example: 'My Project' })
    name!: string;

    @ApiProperty({ example: 'This is my project description' })
    description!: string;

    @ApiProperty({ type: String, format: 'int64', example: '1717756800' })
    createdAtUnixSeconds!: string;
    
    @ApiProperty({ type: String, format: 'int64', example: '1717756800' })
    updatedAtUnixSeconds!: string;
}