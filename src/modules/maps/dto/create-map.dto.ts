import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  MaxLength,
  MinLength,
  IsInt,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMapDto {
  @ApiProperty({
    description: 'Map name',
    example: 'Mapa de Operaciones - Zona 10',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Map description',
    example: 'Mapa principal para operaciones en la Zona 10 de Guatemala',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'ArcGIS WebMap Item ID (required only for arcgis map type)',
    example: 'a1b2c3d4e5f6g7h8i9j0',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  webmapItemId?: string;

  @ApiProperty({
    description: 'Map type ID (references map_types table)',
    example: 1,
    type: 'integer',
  })
  @IsInt()
  @IsPositive()
  mapTypeId: number;

  @ApiPropertyOptional({
    description: 'Whether this is the default map',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;

  @ApiPropertyOptional({
    description: 'Whether this map can be accessed publicly (for embeds)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiPropertyOptional({
    description: 'Map settings and configuration (JSON)',
    example: {
      basemap: 'streets',
      zoom: 12,
      center: [-90.5069, 14.6349],
      showAttribution: true,
    },
  })
  @IsOptional()
  @IsObject()
  settings?: any;
}
