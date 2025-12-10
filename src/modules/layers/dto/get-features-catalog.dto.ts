import { IsOptional, IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetFeaturesCatalogDto {
  @ApiPropertyOptional({
    description: 'Array de IDs de features específicas a obtener. Si no se envía, retorna todas.',
    example: [1, 5, 10, 23],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  featureIds?: number[];
}
