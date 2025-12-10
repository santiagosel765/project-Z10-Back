import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class SdkTokenValidateRequestDto {
  @ApiPropertyOptional({
    description:
      'Token SDK en formato crudo. Si no se envía aquí, puede enviarse por cabecera X-SDK-Token.',
    example: 'znt_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  token?: string;
}

export class SdkTokenValidateResponseDto {
  @ApiProperty({ description: 'Indica si el token es válido' })
  valid: boolean;

  @ApiProperty({ description: 'ID del cliente asociado', example: 1 })
  clientId: number;

  @ApiPropertyOptional({ description: 'Nombre del cliente', example: 'Mobile App Client' })
  clientName?: string;

  @ApiPropertyOptional({
    description: 'Scopes asociados al token (reservado para futuro uso)',
    type: [String],
    example: ['maps:read'],
  })
  scopes?: string[];
}

export class SdkTokenExchangeResponseDto {
  @ApiProperty({ description: 'JWT de corta duración' })
  accessToken: string;

  @ApiProperty({ description: 'Tiempo de expiración en segundos', example: 900 })
  expiresIn: number;

  @ApiProperty({ description: 'Tipo de token', example: 'Bearer' })
  tokenType: string;
}
