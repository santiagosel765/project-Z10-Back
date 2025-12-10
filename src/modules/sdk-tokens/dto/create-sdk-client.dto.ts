import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSdkClientDto {
  @ApiProperty({
    description: 'Client name (unique identifier)',
    example: 'Mobile App Client',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Client description or purpose',
    example: 'SDK client for mobile application integration',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Contact email for the client',
    example: 'developer@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
