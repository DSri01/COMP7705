import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
export class UpdateProjectDto {

    @ApiProperty({ example: 'This is my project description', minLength: 1, maxLength: 20000 })
    @IsString()
    @Length(1, 20000)
    description!: string;
}