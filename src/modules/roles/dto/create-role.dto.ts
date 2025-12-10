import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  MinLength,
  MaxLength,
  Matches,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Nombre del rol (solo minúsculas y guiones bajos)',
    example: 'admin',
    minLength: 3,
    maxLength: 50,
    pattern: '^[a-z_]+$',
  })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres' })
  @Matches(/^[a-z_]+$/, {
    message: 'El nombre solo puede contener letras minúsculas y guiones bajos',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del rol',
    example: 'Administrador del sistema con acceso completo',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Si el rol está activo',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'IDs de las páginas que tendrá acceso este rol',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsOptional()
  @ArrayMinSize(1, { message: 'Debe proporcionar al menos una página' })
  @IsInt({ each: true, message: 'Cada pageId debe ser un número entero' })
  @Type(() => Number)
  pageIds?: number[];
}
