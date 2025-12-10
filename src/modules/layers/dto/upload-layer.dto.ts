import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  MaxLength,
  MinLength,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadLayerDto {
  @ApiProperty({
    description: 'Layer name',
    example: 'Puntos de Interés - Zona 10',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  @MaxLength(200, { message: 'Name must not exceed 200 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Layer description',
    example: 'Puntos de interés relevantes en la Zona 10 de Guatemala',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the layer is public',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPublic?: boolean = true;

  @ApiPropertyOptional({
    description: 'Layer styling configuration (JSON)',
    example: {
      fillColor: '#ff0000',
      fillOpacity: 0.5,
      strokeColor: '#000000',
      strokeWidth: 2,
    },
  })
  @IsOptional()
  // @IsObject()
  style?: {
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
    iconUrl?: string;
    iconSize?: number[];
    iconAnchor?: number[];
    color?: string;
    weight?: number;
    opacity?: number;
  };

  @ApiPropertyOptional({
    description: 'User ID',
    example: '1',
  })
  @IsNumber()
  userId: number;

  @ApiPropertyOptional({
    description: 'User ID',
    example: '1',
  })
  @IsNumber()
  createdBy: number;

  @ApiPropertyOptional({
    description: 'Map ID to associate this layer with',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  mapId?: number;

  @ApiPropertyOptional({
    description: 'Display order in the map (if mapId is provided)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}
