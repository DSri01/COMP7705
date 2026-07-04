import { ApiProperty } from '@nestjs/swagger';

export class ComponentResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174111' })
  projectId!: string;

  @ApiProperty({ example: 'authService' })
  name!: string;

  @ApiProperty({ example: 'Authentication container deployment context' })
  description!: string;

  @ApiProperty({ type: String, format: 'int64', example: '1717756800' })
  createdAtUnixSeconds!: string;

  @ApiProperty({ type: String, format: 'int64', example: '1717756800' })
  updatedAtUnixSeconds!: string;
}
