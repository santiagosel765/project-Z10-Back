import { IsInt, IsPositive, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSdkTokenDto {
  @ApiProperty({
    description: 'Client ID that owns this token',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  clientId: number;

  @ApiPropertyOptional({
    description: 'Requests per hour limit',
    example: 1000,
    default: 1000,
    minimum: 1,
    maximum: 100000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  rateLimit?: number;

  @ApiPropertyOptional({
    description: 'Token expiration date (ISO 8601 format)',
    example: '2026-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
