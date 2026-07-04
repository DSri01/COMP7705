import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContainerImageResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174111' })
  componentId!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174222' })
  storedFileId!: string;

  @ApiProperty({ example: 7 })
  chainIndex!: number;

  @ApiProperty({ enum: ['awaiting_upload', 'uploading', 'ready', 'failed'] })
  fileStatus!: 'awaiting_upload' | 'uploading' | 'ready' | 'failed';

  @ApiPropertyOptional({ example: 'tar', nullable: true })
  fileExtension!: string | null;

  @ApiPropertyOptional({ type: String, format: 'int64', example: '3456789012', nullable: true })
  fileSizeBytes!: string | null;

  @ApiPropertyOptional({ type: String, format: 'int64', example: '1717756800', nullable: true })
  fileUploadStartedAtUnixSeconds!: string | null;

  @ApiProperty({ type: String, format: 'int64', example: '1717756800' })
  createdAtUnixSeconds!: string;

  @ApiPropertyOptional({ type: String, format: 'int64', example: '1717756920', nullable: true })
  uploadFinishedAtUnixSeconds!: string | null;

  @ApiProperty({ enum: ['ok', 'container_not_uploaded', 'scanning'] })
  scanResultCode!: 'ok' | 'container_not_uploaded' | 'scanning';

  @ApiProperty({ type: String, format: 'int64', example: '0' })
  scanAttemptedAtUnixSeconds!: string;

  @ApiProperty({ type: String, format: 'int64', example: '0' })
  scanFinishedAtUnixSeconds!: string;
}
