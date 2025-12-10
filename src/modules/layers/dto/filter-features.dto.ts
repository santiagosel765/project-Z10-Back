import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';

export class FilterFeaturesDto {

  @IsOptional()
  @IsObject()
  filters?: Record<string, string | string[]>;

  @ApiPropertyOptional({
    description: `
      IDs específicos de features a obtener.
      Si se proporciona junto con filters, se aplicarán AMBOS (AND).
    `,
    type: [Number],
    example: [1, 5, 10, 23],
  })
  @IsOptional()
  featureIds?: number[];
}
