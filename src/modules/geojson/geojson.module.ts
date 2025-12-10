import { Module } from '@nestjs/common';
import { GeoJsonService } from './geojson.service';

@Module({
  providers: [GeoJsonService],
  exports: [GeoJsonService],
})
export class GeoJsonModule {}