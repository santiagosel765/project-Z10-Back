import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SdkTokenResponseDto {
  @ApiProperty({ description: 'ID del token SDK', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID del cliente dueño del token', example: 3 })
  clientId: number;

  @ApiProperty({ description: 'Prefijo del token para referencia', example: 'znt_a1b2c3d4...' })
  tokenPrefix: string;

  @ApiPropertyOptional({ description: 'Etiqueta o nombre amigable', example: 'Integración mobile' })
  label?: string;

  @ApiPropertyOptional({
    description: 'Scopes asociados (reservado para futuro uso)',
    type: [String],
    example: ['maps:read'],
  })
  scopes?: string[];

  @ApiPropertyOptional({ description: 'Límite de peticiones por hora', example: 1000 })
  rateLimit?: number;

  @ApiProperty({ description: 'Indica si el token está activo', example: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Fecha de expiración', type: String, format: 'date-time' })
  expiresAt?: Date | null;

  @ApiPropertyOptional({ description: 'Última vez que se usó el token', type: String, format: 'date-time' })
  lastUsedAt?: Date | null;

  @ApiProperty({ description: 'Fecha de creación', type: String, format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Token crudo generado (solo visible al crearlo)',
    example: 'znt_a1b2c3d4e5f6...',
  })
  rawToken?: string;

  @ApiPropertyOptional({
    description: 'Mensaje de advertencia al generar el token',
    example: 'Guarda este token de forma segura. No podrás verlo de nuevo.',
  })
  warning?: string;

  @ApiPropertyOptional({ description: 'Nombre del cliente asociado', example: 'Mobile App Client' })
  clientName?: string;
}

export class SdkClientResponseDto {
  @ApiProperty({ description: 'ID del cliente SDK', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nombre del cliente SDK', example: 'Mobile App Client' })
  name: string;

  @ApiPropertyOptional({ description: 'Descripción del cliente' })
  description?: string;

  @ApiPropertyOptional({ description: 'Email de contacto', example: 'developer@example.com' })
  email?: string;

  @ApiProperty({ description: 'Estado activo', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Fecha de creación', type: String, format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Fecha de actualización', type: String, format: 'date-time' })
  updatedAt?: Date;
}

export class SdkClientWithTokensResponseDto extends SdkClientResponseDto {
  @ApiPropertyOptional({
    description: 'Tokens asociados al cliente',
    type: [SdkTokenResponseDto],
  })
  tokens?: SdkTokenResponseDto[];
}
