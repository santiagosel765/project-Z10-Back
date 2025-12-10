import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsInt,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLayerDto {
  @ApiPropertyOptional({
    description: 'Layer name',
    example: 'Updated Layer Name',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Layer description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the layer is public',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Layer styling configuration',
  })
  @IsOptional()
  @IsObject()
  style?: any;

  @ApiPropertyOptional({
    description: 'Map ID to associate this layer with. Use null to remove association.',
    example: 1,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mapId?: number | null;
}