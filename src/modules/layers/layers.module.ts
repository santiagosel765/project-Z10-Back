import { Module } from '@nestjs/common';
import { LayersService } from './layers.service';
import { LayersController } from './layers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Layer, LayerFeature, Map, MapLayer } from 'src/entities';
import { GeoJsonService } from '../geojson/geojson.service';

@Module({
  imports: [
      TypeOrmModule.forFeature([Layer, LayerFeature, Map, MapLayer])
  ],
  controllers: [LayersController],
  providers: [LayersService, GeoJsonService],
  exports: [LayersService],
})
export class LayersModule {}
