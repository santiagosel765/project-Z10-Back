import {
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMapLayerDto {
  @ApiPropertyOptional({
    description: 'Display order (lower numbers appear first)',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the layer is visible on the map',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({
    description: 'Layer opacity (0.0 to 1.0)',
    example: 0.8,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @ApiPropertyOptional({
    description: 'Additional layer configuration (JSON)',
  })
  @IsOptional()
  @IsObject()
  layerConfig?: any;
}
