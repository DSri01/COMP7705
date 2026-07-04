import { ApiProperty } from '@nestjs/swagger';

export class LinkImageCvesResponseDto {
  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';
}
