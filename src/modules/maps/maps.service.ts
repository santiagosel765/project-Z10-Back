import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Map } from './entities/map.entity';
import { MapLayer } from './entities/map-layer.entity';
import { MapType } from './entities/map-type.entity';
import { CreateMapDto } from './dto/create-map.dto';
import { UpdateMapDto } from './dto/update-map.dto';
import { formatDate } from 'src/common/utils/date-formatter.utils';

@Injectable()
export class MapsService {
  private logger = new Logger(MapsService.name);

  constructor(
    @InjectRepository(Map)
    private mapRepository: Repository<Map>,

    @InjectRepository(MapLayer)
    private mapLayerRepository: Repository<MapLayer>,

    @InjectRepository(MapType)
    private mapTypeRepository: Repository<MapType>,

    private dataSource: DataSource,
  ) {}

  /**
   * Crear un nuevo mapa con transacción
   */
  async create(createMapDto: CreateMapDto, userId: number) {
    this.logger.log(`User ID: "${userId}"`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (createMapDto.isDefault) {
        await queryRunner.manager.update(
          Map,
          { isDefault: true },
          { isDefault: false },
        );
      }

      // Validar que el mapType existe
      const mapType = await queryRunner.manager.findOne(MapType, {
        where: { id: createMapDto.mapTypeId, isActive: true },
      });

      if (!mapType) {
        throw new NotFoundException(`Map type con ID ${createMapDto.mapTypeId} no encontrado`);
      }

      // Validar webmapItemId si es tipo arcgis
      if (mapType.code === 'arcgis' && !createMapDto.webmapItemId) {
        throw new BadRequestException('webmapItemId es requerido para mapas tipo ArcGIS');
      }

      const map = queryRunner.manager.create(Map, {
        name: createMapDto.name,
        description: createMapDto.description,
        webmapItemId: createMapDto.webmapItemId,
        mapTypeId: createMapDto.mapTypeId,
        isDefault: createMapDto.isDefault || false,
        settings: createMapDto.settings || {},
        createdBy: userId,
        updatedBy: userId,
      });

      const savedMap = await queryRunner.manager.save(map);

      await queryRunner.commitTransaction();

      // Cargar mapType para incluirlo en la respuesta
      const mapWithType = await this.mapRepository.findOne({
        where: { id: savedMap.id },
        relations: ['mapType'],
      });

      if (!mapWithType) {
        throw new NotFoundException(`Mapa con ID ${savedMap.id} no encontrado después de crear`);
      }

      return {
        id: mapWithType.id,
        name: mapWithType.name,
        description: mapWithType.description,
        webmapItemId: mapWithType.webmapItemId,
        mapType: {
          id: mapWithType.mapType.id,
          code: mapWithType.mapType.code,
          name: mapWithType.mapType.name,
        },
        isDefault: mapWithType.isDefault,
        settings: mapWithType.settings,
        createdAt: formatDate(mapWithType.createdAt),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtener todos los mapas activos
   */
  async findAll(page: number = 1, limit: number = 20) {
    const [maps, total] = await this.mapRepository.findAndCount({
      where: { isActive: true },
      relations: ['mapType'],
      select: [
        'id',
        'name',
        'description',
        'webmapItemId',
        'mapTypeId',
        'isDefault',
        'settings',
        'createdAt',
        'updatedAt',
      ],
      order: { isDefault: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: maps,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener mapa por ID con sus capas asociadas
   */
  async findOne(id: number, includeLayers: boolean = false) {
    console.log({id})
    const queryBuilder = this.mapRepository
      .createQueryBuilder('map')
      .leftJoinAndSelect('map.mapType', 'mapType')
      .where('map.id = :id', { id })
      .andWhere('map.isActive = true');

    if (includeLayers) {
      queryBuilder
        .leftJoinAndSelect('map.mapLayers', 'mapLayer')
        .leftJoinAndSelect('mapLayer.layer', 'layer')
        // .where("layer.isActive = true")
        .orderBy('mapLayer.displayOrder', 'ASC');
    }

    const map = await queryBuilder.getOne();
    console.log({map})

    if (!map) {
      throw new NotFoundException(`Mapa con ID ${id} no encontrado`);
    }

    return {
      ...map,
      createdAt: formatDate(map.createdAt),
      updatedAt: formatDate(map.updatedAt),
    };
  }

  /**
   * Obtener mapa por defecto
   */
  async getDefaultMap() {
    const map = await this.mapRepository.findOne({
      where: { isDefault: true, isActive: true },
      relations: ['mapType', 'mapLayers', 'mapLayers.layer'],
      order: { mapLayers: { displayOrder: 'ASC' } },
    });

    if (!map) {
      throw new NotFoundException('Mapa por defecto no configurado');
    }

    return map;
  }

  /**
   * Actualizar mapa con transacción
   */
  async update(id: number, updateMapDto: UpdateMapDto, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const map = await queryRunner.manager.findOne(Map, {
        where: { id, isActive: true },
      });

      if (!map) {
        throw new NotFoundException(`Mapa con ID ${id} no encontrado`);
      }

      // Validar mapTypeId si se está actualizando
      if (updateMapDto.mapTypeId !== undefined) {
        const mapType = await queryRunner.manager.findOne(MapType, {
          where: { id: updateMapDto.mapTypeId, isActive: true },
        });

        if (!mapType) {
          throw new NotFoundException(`Map type con ID ${updateMapDto.mapTypeId} no encontrado`);
        }

        // Validar webmapItemId si el nuevo tipo es arcgis
        if (mapType.code === 'arcgis' && !updateMapDto.webmapItemId && !map.webmapItemId) {
          throw new BadRequestException('webmapItemId es requerido para mapas tipo ArcGIS');
        }
      }

      // ? Si se marca como default, desmarcar otros mapas
      if (updateMapDto.isDefault && !map.isDefault) {
        await queryRunner.manager.update(
          Map,
          { isDefault: true },
          { isDefault: false },
        );
      }

      if (updateMapDto.name !== undefined) map.name = updateMapDto.name;
      if (updateMapDto.description !== undefined)
        map.description = updateMapDto.description;
      if (updateMapDto.webmapItemId !== undefined)
        map.webmapItemId = updateMapDto.webmapItemId;
      if (updateMapDto.mapTypeId !== undefined)
        map.mapTypeId = updateMapDto.mapTypeId;
      if (updateMapDto.isDefault !== undefined)
        map.isDefault = updateMapDto.isDefault;
      if (updateMapDto.settings !== undefined)
        map.settings = updateMapDto.settings;

      map.updatedBy = userId;

      const updatedMap = await queryRunner.manager.save(map);

      await queryRunner.commitTransaction();

      // Cargar mapType para incluirlo en la respuesta
      const mapWithType = await this.mapRepository.findOne({
        where: { id: updatedMap.id },
        relations: ['mapType'],
      });

      if (!mapWithType) {
        throw new NotFoundException(`Mapa con ID ${updatedMap.id} no encontrado después de actualizar`);
      }

      return {
        id: mapWithType.id,
        name: mapWithType.name,
        description: mapWithType.description,
        webmapItemId: mapWithType.webmapItemId,
        mapType: {
          id: mapWithType.mapType.id,
          code: mapWithType.mapType.code,
          name: mapWithType.mapType.name,
        },
        isDefault: mapWithType.isDefault,
        settings: mapWithType.settings,
        updatedAt: formatDate(mapWithType.updatedAt),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Eliminar mapa (soft delete) con transacción
   */
  async remove(id: number, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const map = await queryRunner.manager.findOne(Map, {
        where: { id, isActive: true },
      });

      if (!map) {
        throw new NotFoundException(`Map con ID ${id} no encontrado`);
      }

      if (map.isDefault) {
        throw new BadRequestException(
          'No se puede eliminar el mapa por defecto, antes asigna otro mapa por defecto',
        );
      }

      map.isActive = false;
      map.updatedBy = userId;
      await queryRunner.manager.save(map);

      await queryRunner.commitTransaction();

      return {
        message: 'Mapa eliminado exitosamente',
        id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Buscar mapas por nombre o tipo
   */
  async searchMaps(
    query: string,
    mapType?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const qb = this.mapRepository
      .createQueryBuilder('map')
      .where('map.isActive = true');

    if (query) {
      qb.andWhere('(map.name ILIKE :query OR map.description ILIKE :query)', {
        query: `%${query}%`,
      });
    }

    if (mapType) {
      qb.andWhere('map.mapType = :mapType', { mapType });
    }

    qb.orderBy('map.isDefault', 'DESC')
      .addOrderBy('map.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [maps, total] = await qb.getManyAndCount();

    return {
      data: maps,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query,
        mapType,
      },
    };
  }

  /**
   * Obtener estadísticas de mapas
   */
  async getMapStats() {
    const result = await this.mapRepository
      .createQueryBuilder('map')
      .select('COUNT(*)', 'totalMaps')
      .addSelect(
        'COUNT(CASE WHEN map.isDefault = true THEN 1 END)',
        'defaultMaps',
      )
      .addSelect(
        'COUNT(CASE WHEN map.map_type_id = :general THEN 1 END)',
        'generalMaps',
      )
      .addSelect(
        'COUNT(CASE WHEN map.map_type_id = :arcgis THEN 1 END)',
        'operationsMaps',
      )

      .where('map.isActive = true')
      .setParameters({
        general: 2,
        arcgis: 1,
      })
      .getRawOne();

    // ? Obtener número de capas por mapa
    const layerCounts = await this.mapLayerRepository
      .createQueryBuilder('ml')
      .select('ml.mapId', 'mapId')
      .addSelect('COUNT(*)', 'layerCount')
      .groupBy('ml.mapId')
      .getRawMany();

    return {
      totalMaps: parseInt(result.totalMaps) || 0,
      defaultMaps: parseInt(result.defaultMaps) || 0,
      generalMaps: parseInt(result.generalMaps) || 0,
      arcgisMaps: parseInt(result.operationsMaps) || 0,
      layerCounts: layerCounts.map((lc) => ({
        mapId: lc.mapId,
        layerCount: parseInt(lc.layerCount),
      })),
    };
  }

  /**
   * Obtener un mapa público por ID (sin autenticación)
   */
  async findPublicMap(id: number, includeLayers: boolean = false) {
    const relations = ['mapType'];
    
    if (includeLayers) {
      relations.push('mapLayers', 'mapLayers.layer');
    }

    const map = await this.mapRepository.findOne({
      where: { id, isPublic: true, isActive: true },
      relations,
    });

    if (!map) {
      throw new NotFoundException(
        `Mapa público con ID ${id} no encontrado o no es público`,
      );
    }

    return {
      ...map,
      embedUrl: `${process.env.CORS_ORIGIN || 'http://localhost:9002'}/embed/map/${map.id}`,
    };
  }

  /**
   * Obtener todos los mapas públicos (sin autenticación)
   */
  async findAllPublicMaps() {
    const maps = await this.mapRepository.find({
      where: { isPublic: true, isActive: true },
      relations: ['mapType'],
      order: {
        isDefault: 'DESC',
        createdAt: 'DESC',
      },
    });

    return maps.map((map) => ({
      ...map,
      embedUrl: `${process.env.CORS_ORIGIN || 'http://localhost:9002'}/embed/map/${map.id}`,
    }));
  }
}
