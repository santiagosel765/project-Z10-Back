import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class TileQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(22)
  z: number; // Zoom level

  @Type(() => Number)
  @IsInt()
  @Min(0)
  x: number; // Tile X coordinate

  @Type(() => Number)
  @IsInt()
  @Min(0)
  y: number; // Tile Y coordinate
}
