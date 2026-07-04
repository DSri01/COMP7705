import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class CreateCveDto {
  @ApiProperty({
    example: 'CVE-2021-44228',
    description: 'Canonical CVE identifier (CVE-YYYY-nnnn+).',
  })
  @IsString()
  @Matches(/^CVE-\d{4}-\d{4,}$/, { message: 'cveId must be a canonical CVE identifier' })
  cveId!: string;
}
