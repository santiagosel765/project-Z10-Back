import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsInt,
  MinLength,
  MaxLength,
  Min,
  Matches,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePageDto {
  @ApiProperty({
    description: 'Nombre de la página',
    example: 'Dashboard Principal',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la página',
    example: 'Panel principal con métricas y estadísticas',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL de la página (debe iniciar con /)',
    example: '/dashboard',
    pattern: '^/[a-zA-Z0-9/_-]*$',
  })
  @IsString()
  @Matches(/^\/[a-zA-Z0-9\/_-]*$/, {
    message: 'La URL debe iniciar con / y solo contener letras, números, /, _ y -',
  })
  url: string;

  @ApiPropertyOptional({
    description: 'Icono de la página (nombre del icono o clase CSS)',
    example: 'dashboard',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'El icono no puede exceder 100 caracteres' })
  icon?: string;

  @ApiPropertyOptional({
    description: 'Orden de visualización de la página (mayor = más arriba)',
    example: 1,
    default: 0,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0, { message: 'El orden no puede ser negativo' })
  order?: number;

  @ApiPropertyOptional({
    description: 'Si la página está activa',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'IDs de los roles que tendrán acceso a esta página',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsOptional()
  @ArrayMinSize(1, { message: 'Debe proporcionar al menos un rol' })
  @IsInt({ each: true, message: 'Cada roleId debe ser un número entero' })
  @Type(() => Number)
  roleIds?: number[];
}
