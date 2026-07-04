import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class LinkImageCvesDto {
  @ApiProperty({
    type: [String],
    example: ['CVE-2021-44228'],
    description: 'CVE ids to attach to the current image. Each id must already exist in the global CVE table (POST /cves).',
  })
  @IsArray()
  @IsString({ each: true })
  cveIds!: string[];
}
