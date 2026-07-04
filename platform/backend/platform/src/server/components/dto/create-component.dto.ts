import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateComponentDto {
  @ApiProperty({ example: 'authService', minLength: 1, maxLength: 120 })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiProperty({ example: 'Authentication container deployment context', minLength: 1, maxLength: 20000 })
  @IsString()
  @Length(1, 20000)
  description!: string;
}
