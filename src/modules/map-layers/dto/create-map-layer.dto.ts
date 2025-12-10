import {
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMapLayerDto {
  @ApiProperty({
    description: 'Map ID',
    example: 1,
  })
  @IsNumber()
  mapId: number;

  @ApiProperty({
    description: 'Layer ID',
    example: 5,
  })
  @IsNumber()
  layerId: number;

  @ApiPropertyOptional({
    description: 'Display order (lower numbers appear first)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the layer is visible on the map',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({
    description: 'Layer opacity (0.0 to 1.0)',
    example: 1.0,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @ApiPropertyOptional({
    description: 'Additional layer configuration (JSON)',
    example: {
      minZoom: 5,
      maxZoom: 18,
      interactive: true,
    },
  })
  @IsOptional()
  @IsObject()
  layerConfig?: any;

  @ApiProperty({
    description: 'User ID who is adding the layer',
    example: 1,
  })
  @IsNumber()
  createdBy: number;
}
