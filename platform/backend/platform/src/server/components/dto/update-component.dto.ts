import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class UpdateComponentDto {
  @ApiProperty({ example: 'Updated component deployment context', minLength: 1, maxLength: 20000 })
  @IsString()
  @Length(1, 20000)
  description!: string;
}
