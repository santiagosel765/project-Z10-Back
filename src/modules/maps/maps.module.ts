import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MapsService } from './maps.service';
import { MapsController } from './maps.controller';
import { MapTypesController } from './controllers/map-types.controller';
import { Map } from './entities/map.entity';
import { MapLayer } from './entities/map-layer.entity';
import { MapType } from './entities/map-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Map, MapLayer, MapType])],
  controllers: [MapsController, MapTypesController],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
