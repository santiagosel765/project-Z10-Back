import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginUserDto {

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password', example: 'P@ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  password: string;

}
