import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapLayer } from '../maps/entities/map-layer.entity';
import { Map } from '../maps/entities/map.entity';
import { Layer } from '../layers/entities/layer.entity';
import { CreateMapLayerDto } from './dto/create-map-layer.dto';
import { UpdateMapLayerDto } from './dto/update-map-layer.dto';

@Injectable()
export class MapLayersService {
  constructor(
    @InjectRepository(MapLayer)
    private mapLayerRepository: Repository<MapLayer>,

    @InjectRepository(Map)
    private mapRepository: Repository<Map>,

    @InjectRepository(Layer)
    private layerRepository: Repository<Layer>,
  ) {}

  async addLayerToMap(createMapLayerDto: CreateMapLayerDto) {
    const { mapId, layerId, createdBy, ...rest } = createMapLayerDto;

    // Verificar que el mapa existe
    const map = await this.mapRepository.findOne({ where: { id: mapId } });
    if (!map) {
      throw new NotFoundException(`Map with ID ${mapId} not found`);
    }

    // Verificar que la capa existe
    const layer = await this.layerRepository.findOne({
      where: { id: layerId },
    });
    if (!layer) {
      throw new NotFoundException(`Layer with ID ${layerId} not found`);
    }

    // Verificar si ya existe la relación
    const existing = await this.mapLayerRepository.findOne({
      where: { mapId, layerId },
    });
    if (existing) {
      throw new ConflictException(
        `Layer ${layerId} is already added to Map ${mapId}`,
      );
    }

    // Crear la relación
    const mapLayer = this.mapLayerRepository.create({
      mapId,
      layerId,
      createdBy,
      ...rest,
    });

    return this.mapLayerRepository.save(mapLayer);
  }

  async getLayersByMap(mapId: number) {
    const map = await this.mapRepository.findOne({ where: { id: mapId } });
    if (!map) {
      throw new NotFoundException(`Map with ID ${mapId} not found`);
    }

    return this.mapLayerRepository.find({
      where: { mapId },
      relations: ['layer', 'layer.user'],
      order: { displayOrder: 'ASC' },
    });
  }

  async getMapsByLayer(layerId: number) {
    const layer = await this.layerRepository.findOne({
      where: { id: layerId },
    });
    if (!layer) {
      throw new NotFoundException(`Layer with ID ${layerId} not found`);
    }

    return this.mapLayerRepository.find({
      where: { layerId },
      relations: ['map'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateMapLayer(
    mapId: number,
    layerId: number,
    updateMapLayerDto: UpdateMapLayerDto,
  ) {
    const mapLayer = await this.mapLayerRepository.findOne({
      where: { mapId, layerId },
    });

    if (!mapLayer) {
      throw new NotFoundException(
        `Layer ${layerId} not found in Map ${mapId}`,
      );
    }

    Object.assign(mapLayer, updateMapLayerDto);
    return this.mapLayerRepository.save(mapLayer);
  }

  async removeLayerFromMap(mapId: number, layerId: number) {
    const mapLayer = await this.mapLayerRepository.findOne({
      where: { mapId, layerId },
    });

    if (!mapLayer) {
      throw new NotFoundException(
        `Layer ${layerId} not found in Map ${mapId}`,
      );
    }

    await this.mapLayerRepository.remove(mapLayer);
    return { message: 'Layer removed from map successfully' };
  }

  async reorderLayers(mapId: number, layerOrders: { layerId: number; displayOrder: number }[]) {
    const map = await this.mapRepository.findOne({ where: { id: mapId } });
    if (!map) {
      throw new NotFoundException(`Map with ID ${mapId} not found`);
    }

    const updatePromises = layerOrders.map(async ({ layerId, displayOrder }) => {
      const mapLayer = await this.mapLayerRepository.findOne({
        where: { mapId, layerId },
      });

      if (!mapLayer) {
        throw new NotFoundException(
          `Layer ${layerId} not found in Map ${mapId}`,
        );
      }

      mapLayer.displayOrder = displayOrder;
      return this.mapLayerRepository.save(mapLayer);
    });

    await Promise.all(updatePromises);
    return { message: 'Layers reordered successfully' };
  }
}
