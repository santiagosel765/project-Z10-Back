import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MapLayer } from '../maps/entities/map-layer.entity';
import { Map } from '../maps/entities/map.entity';
import { Layer } from '../layers/entities/layer.entity';
import { MapLayersController } from './map-layers.controller';
import { MapLayersService } from './map-layers.service';

@Module({
  imports: [TypeOrmModule.forFeature([MapLayer, Map, Layer])],
  controllers: [MapLayersController],
  providers: [MapLayersService],
  exports: [MapLayersService],
})
export class MapLayersModule {}
