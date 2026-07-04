import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
export class CreateProjectDto {

    @ApiProperty({ example: 'My Project', minLength: 1, maxLength: 120 })
    @IsString()
    @Length(1, 120)
    name!: string;
    
    @ApiProperty({ example: 'This is my project description', minLength: 1, maxLength: 20000 })
    @IsString()
    @Length(1, 20000)
    description!: string;
}