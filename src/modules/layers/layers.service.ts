import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Layer } from './entities/layer.entity';
import { LayerFeature } from './entities/layer-feature.entity';
import { MapLayer } from '../maps/entities/map-layer.entity';
import { Map } from '../maps/entities/map.entity';
import { GeoJsonService } from '../geojson/geojson.service';

import { UpdateLayerDto } from './dto/update-layer.dto';
import type { FeatureCollection } from 'geojson';
import { UploadLayerDto } from './dto/upload-layer.dto';

@Injectable()
export class LayersService {
  private logger: Logger = new Logger(LayersService.name);

  constructor(
    @InjectRepository(Layer)
    private layerRepository: Repository<Layer>,

    @InjectRepository(LayerFeature)
    private layerFeatureRepository: Repository<LayerFeature>,

    @InjectRepository(MapLayer)
    private mapLayerRepository: Repository<MapLayer>,

    @InjectRepository(Map)
    private mapRepository: Repository<Map>,

    private geoJsonService: GeoJsonService,

    private dataSource: DataSource,
  ) {}

  /**
   * Crear capa desde GeoJSON subido
   */
  async createLayerFromGeoJson(
    geojsonBuffer: Buffer,
    dto: UploadLayerDto,
    userId: number,
    fileName?: string,
  ) {
    let geojsonData: any;
    try {
      // geojsonData = JSON.parse(geojsonBuffer.toString('utf-8'));
      geojsonData = JSON.parse(geojsonBuffer.toString());
    } catch (e) {
      throw new BadRequestException(
        'El archivo no es un JSON válido. Por favor sube un archivo GeoJSON válido.' + e,
      );
    }

    const validatedGeoJson =
      this.geoJsonService.validateAndNormalize(geojsonData);

    // Validar complejidad - aumentado para soportar capas grandes
    this.geoJsonService.validateComplexity(
      validatedGeoJson,
      150000, // max features (aumentado de 10k a 150k)
      100000, // max vertices per feature (aumentado de 10k a 50k)
    );

    const metadata = this.geoJsonService.extractMetadata(validatedGeoJson);
    console.log({ metadata });

    // Parsear style si viene como string (desde FormData)
    let parsedStyle: any = dto.style;
    if (dto.style && typeof dto.style === 'string') {
      try {
        parsedStyle = JSON.parse(dto.style);
      } catch (error) {
        this.logger.warn(`Failed to parse style JSON: ${error.message}`);
        parsedStyle = undefined;
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const layer = queryRunner.manager.create(Layer, {
        name: dto.name,
        description: dto.description,
        userId: userId,
        layerType: metadata.layerType as
          | 'point'
          | 'linestring'
          | 'polygon'
          | 'multipoint'
          | 'multilinestring'
          | 'multipolygon'
          | 'mixed',
        totalFeatures: metadata.totalFeatures,
        style: parsedStyle || this.getDefaultStyle(metadata.layerType),
        isPublic: dto.isPublic || false,
        originalFilename: fileName,
        fileSizeBytes: geojsonBuffer.length,
        createdBy: userId,
        updatedBy: userId,
      });

      const savedLayer = await queryRunner.manager.save(layer);

      await this.insertFeaturesWithGeometry(
        queryRunner,
        savedLayer.id,
        validatedGeoJson,
      );

      await this.updateLayerBBox(queryRunner, savedLayer.id);

      // Si se proporciona mapId, crear la relación MapLayer
      if (dto.mapId) {
        // Verificar que el mapa existe
        const map = await queryRunner.manager.findOne(Map, {
          where: { id: dto.mapId, isActive: true },
        });

        if (!map) {
          throw new NotFoundException(`Mapa con ID ${dto.mapId} no encontrado`);
        }

        // Crear la relación MapLayer
        const mapLayer = queryRunner.manager.create(MapLayer, {
          mapId: dto.mapId,
          layerId: savedLayer.id,
          displayOrder: dto.displayOrder ?? 0,
          isVisible: true,
          opacity: 1.0,
          createdBy: userId,
        });

        await queryRunner.manager.save(mapLayer);
      }

      await queryRunner.commitTransaction();

      return {
        id: savedLayer.id,
        name: savedLayer.name,
        description: savedLayer.description,
        layerType: metadata.layerType,
        totalFeatures: metadata.totalFeatures,
        centroid: metadata.centroid,
        bbox: metadata.bbox,
        geometryTypes: metadata.geometryTypes,
        properties: metadata.properties,
        summary: this.geoJsonService.generateSummary(metadata),
        createdAt: savedLayer.createdAt,
        mapId: dto.mapId || null,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Insertar features usando SQL directo para mejor performance
   * Simplifica geometrías complejas automáticamente
   * OPTIMIZADO: Para capas grandes (>10k features)
   */
  private async insertFeaturesWithGeometry(
    queryRunner: any,
    layerId: number,
    geojson: FeatureCollection,
  ) {
    const totalFeatures = geojson.features.length;
    const isLargeLayer = totalFeatures > 10000;

    if (isLargeLayer) {
      this.logger.log(
        `Insertando capa grande con ${totalFeatures} features. Optimizando...`,
      );

      // Para capas grandes: deshabilitar índices temporalmente
      await queryRunner.query(`
        DROP INDEX IF EXISTS idx_layer_feature_geometry;
        DROP INDEX IF EXISTS idx_layer_feature_layer_id;
      `);
    }

    const batchSize = isLargeLayer ? 1000 : 500;
    const features = geojson.features;

    for (let i = 0; i < features.length; i += batchSize) {
      if (i % 5000 === 0 && i > 0) {
        this.logger.log(`Progreso: ${i}/${totalFeatures} features insertados...`);
      }
      const batch = features.slice(i, i + batchSize);
      const values: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      batch.forEach((feature, batchIndex) => {
        const featureIndex = i + batchIndex;

        let wkt = this.geoJsonService.geojsonToWKT(feature.geometry);

        const vertexCount = this.countVertices(feature.geometry);

        const needsSimplification = vertexCount > 1000;

        values.push(
          needsSimplification
            ? `($${paramIndex}, $${paramIndex + 1}, ST_SimplifyPreserveTopology(ST_SetSRID(ST_GeomFromText($${paramIndex + 2}), 4326), 0.0001), $${paramIndex + 3})`
            : `($${paramIndex}, $${paramIndex + 1}, ST_SetSRID(ST_GeomFromText($${paramIndex + 2}), 4326), $${paramIndex + 3})`,
        );

        params.push(
          layerId,
          featureIndex,
          wkt,
          JSON.stringify(feature.properties || {}),
        );

        paramIndex += 4;
      });

      const sql = `
      INSERT INTO public.layer_feature (layer_id, feature_index, geometry, properties)
      VALUES ${values.join(', ')}
    `;

      await queryRunner.query(sql, params);
    }

    // Reconstruir índices para capas grandes
    if (isLargeLayer) {
      this.logger.log('Reconstruyendo índices espaciales...');

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_layer_feature_geometry 
        ON layer_feature USING GIST (geometry);
        
        CREATE INDEX IF NOT EXISTS idx_layer_feature_layer_id 
        ON layer_feature (layer_id);
      `);

      // Analizar tabla para actualizar estadísticas del query planner
      await queryRunner.query(`ANALYZE layer_feature;`);

      this.logger.log(`Inserción completada: ${totalFeatures} features`);
    }
  }

  /**
   * Contar vértices de una geometría (es el número de coordenadas en una geometría)
   */
  private countVertices(geometry: any): number {
    let count = 0;

    const traverse = (coords: any) => {
      if (typeof coords[0] === 'number') {
        count++;
      } else {
        coords.forEach(traverse);
      }
    };

    traverse(geometry.coordinates);
    return count;
  }
  /**
   * Actualizar bounding box de la capa usando PostGIS
   * Fuerza el resultado a Polygon para evitar errores con LineString o Point
   */
  private async updateLayerBBox(queryRunner: any, layerId: number) {
    const sql = `
      UPDATE public.layer
      SET bbox_geometry = (
        SELECT 
          CASE 
            WHEN GeometryType(ST_Envelope(ST_Union(geometry))) = 'POLYGON' THEN 
              ST_Envelope(ST_Union(geometry))
            WHEN GeometryType(ST_Envelope(ST_Union(geometry))) = 'LINESTRING' THEN 
              ST_Buffer(ST_Envelope(ST_Union(geometry)), 0.0001)::geometry(Polygon, 4326)
            WHEN GeometryType(ST_Envelope(ST_Union(geometry))) = 'POINT' THEN 
              ST_Buffer(ST_Envelope(ST_Union(geometry)), 0.001)::geometry(Polygon, 4326)
            ELSE 
              ST_Envelope(ST_Union(geometry))
          END
        FROM public.layer_feature
        WHERE layer_id = $1
      )
      WHERE id = $1
    `;

    await queryRunner.query(sql, [layerId]);
  }

  /**
   * Obtener estilo por defecto según tipo de geometría
   */
  private getDefaultStyle(layerType: string): any {
    const styles: Record<string, any> = {
      point: {
        iconUrl: '/icons/marker-default.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        color: '#3388ff',
      },
      multipoint: {
        iconUrl: '/icons/marker-default.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        color: '#3388ff',
      },
      linestring: {
        color: '#3388ff',
        weight: 3,
        opacity: 0.8,
      },
      multilinestring: {
        color: '#3388ff',
        weight: 3,
        opacity: 0.8,
      },
      polygon: {
        fillColor: '#3388ff',
        fillOpacity: 0.2,
        color: '#3388ff',
        weight: 2,
      },
      multipolygon: {
        fillColor: '#3388ff',
        fillOpacity: 0.2,
        color: '#3388ff',
        weight: 2,
      },
      mixed: {
        color: '#3388ff',
        weight: 2,
        fillOpacity: 0.2,
      },
    };

    return styles[layerType] || styles.mixed;
  }

  /**
   * Obtener capa como GeoJSON
   */
  async getLayerAsGeoJson(layerId: number, userId?: number): Promise<any> {
    const layer = await this.layerRepository.findOne({
      where: { id: layerId, isActive: true },
    });

    if (!layer) {
      throw new NotFoundException(`Capa con ID ${layerId} no encontrada`);
    }

    // if (!this.canUserAccessLayer(layer, userId)) {
    //   throw new ForbiddenException(
    //     'No tienes permiso para acceder a esta capa',
    //   );
    // }

    const result = await this.dataSource.query(
      `SELECT public.get_layer_as_geojson($1) as geojson`,
      [layerId],
    );

    return result[0]?.geojson || { type: 'FeatureCollection', features: [] };
  }

  /**
   * Obtener tile vectorial (MVT) para rendering eficiente
   * Perfecto para capas con >10,000 features
   */
  async getLayerTile(
    layerId: number,
    z: number,
    x: number,
    y: number,
    userId?: number,
  ): Promise<Buffer> {
    const layer = await this.layerRepository.findOne({
      where: { id: layerId, isActive: true },
    });

    if (!layer) {
      throw new NotFoundException(`Capa con ID ${layerId} no encontrada`);
    }

    // Simplificación dinámica basada en zoom
    // Zoom bajo = más simplificación, zoom alto = más detalle
    const tolerance = this.getSimplificationTolerance(z);

    const sql = `
      WITH bounds AS (
        SELECT ST_TileEnvelope($1, $2, $3) AS geom
      ),
      mvtgeom AS (
        SELECT
          ST_AsMVTGeom(
            ST_Transform(
              CASE 
                WHEN $4 > 0 THEN ST_SimplifyPreserveTopology(lf.geometry, $4)
                ELSE lf.geometry
              END,
              3857
            ),
            bounds.geom,
            4096,
            256,
            true
          ) AS geom,
          lf.properties,
          lf.feature_index
        FROM layer_feature lf, bounds
        WHERE lf.layer_id = $5
          AND ST_Intersects(lf.geometry, ST_Transform(bounds.geom, 4326))
      )
      SELECT ST_AsMVT(mvtgeom.*, 'layer', 4096, 'geom') as tile
      FROM mvtgeom
      WHERE geom IS NOT NULL;
    `;

    const result = await this.dataSource.query(sql, [z, x, y, tolerance, layerId]);
    return result[0]?.tile || Buffer.alloc(0);
  }

  /**
   * Calcular tolerancia de simplificación según nivel de zoom
   */
  private getSimplificationTolerance(zoom: number): number {
    if (zoom >= 14) return 0; // Sin simplificación en zoom alto
    if (zoom >= 10) return 0.0001;
    if (zoom >= 7) return 0.001;
    if (zoom >= 4) return 0.01;
    return 0.05; // Máxima simplificación en zoom bajo
  }

  /**
   * Obtener clusters de puntos para mejor performance
   * Agrupa features cercanos cuando hay muchos
   */
  async getLayerClusters(
    layerId: number,
    bounds: {
      minLon: number;
      minLat: number;
      maxLon: number;
      maxLat: number;
    },
    zoom: number,
    userId?: number,
  ): Promise<any> {
    const layer = await this.layerRepository.findOne({
      where: { id: layerId, isActive: true },
    });

    if (!layer) {
      throw new NotFoundException(`Capa con ID ${layerId} no encontrada`);
    }

    // Radio de clustering basado en zoom (en grados)
    const clusterRadius = this.getClusterRadius(zoom);

    const sql = `
      WITH clusters AS (
        SELECT
          ST_ClusterKMeans(geometry, LEAST(COUNT(*) / 10, 50)::int) OVER (
            PARTITION BY layer_id
          ) AS cluster_id,
          geometry,
          properties
        FROM layer_feature
        WHERE layer_id = $1
          AND ST_Intersects(
            geometry,
            ST_MakeEnvelope($2, $3, $4, $5, 4326)
          )
      ),
      cluster_points AS (
        SELECT
          cluster_id,
          COUNT(*) as point_count,
          ST_Centroid(ST_Collect(geometry)) as center,
          jsonb_agg(properties) as properties_sample
        FROM clusters
        GROUP BY cluster_id
      )
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(center)::jsonb,
            'properties', jsonb_build_object(
              'cluster', true,
              'point_count', point_count,
              'sample_properties', properties_sample -> 0
            )
          )
        )
      ) as geojson
      FROM cluster_points;
    `;

    const result = await this.dataSource.query(sql, [
      layerId,
      bounds.minLon,
      bounds.minLat,
      bounds.maxLon,
      bounds.maxLat,
    ]);

    return result[0]?.geojson || { type: 'FeatureCollection', features: [] };
  }

  /**
   * Calcular radio de clustering según zoom
   */
  private getClusterRadius(zoom: number): number {
    if (zoom >= 15) return 0.0001; // Clusters muy pequeños
    if (zoom >= 10) return 0.001;
    if (zoom >= 7) return 0.01;
    return 0.1; // Clusters grandes en zoom bajo
  }

  /**
   * Obtener features de una capa que se intersectan con una geometría dada
   * Útil para filtrar puntos dentro de un polígono, líneas que cruzan un área, etc.
   */
  async getLayerFeaturesIntersecting(
    layerId: number,
    geometry: any, // GeoJSON geometry
    maxFeatures: number = 5000,
    simplify: boolean = false,
    userId?: number,
  ): Promise<any> {
    const layer = await this.layerRepository.findOne({
      where: { id: layerId, isActive: true },
    });

    if (!layer) {
      throw new NotFoundException(`Capa con ID ${layerId} no encontrada`);
    }

    // Validar que la geometría sea válida
    if (!geometry || !geometry.type || !geometry.coordinates) {
      throw new BadRequestException('La geometría proporcionada no es válida. Debe ser un objeto GeoJSON Geometry.');
    }

    // Convertir geometría GeoJSON a WKT para PostGIS
    let wkt: string;
    try {
      wkt = this.geoJsonService.geojsonToWKT(geometry);
    } catch (error) {
      throw new BadRequestException(`Error al procesar la geometría: ${error.message}`);
    }

    // Primero contar cuántos features intersectan
    const countResult = await this.dataSource.query(
      `
      SELECT COUNT(*) as count
      FROM layer_feature
      WHERE layer_id = $1
        AND ST_Intersects(
          geometry,
          ST_SetSRID(ST_GeomFromText($2), 4326)
        )
      `,
      [layerId, wkt],
    );

    const totalIntersecting = parseInt(countResult[0]?.count || '0');
    const isLimited = totalIntersecting > maxFeatures;

    this.logger.debug(
      `Layer ${layerId}: ${totalIntersecting} features intersectan con la geometría proporcionada`
    );

    // Query con límite y simplificación opcional
    const sql = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(${
              simplify
                ? 'ST_SimplifyPreserveTopology(geometry, 0.0001)'
                : 'geometry'
            })::jsonb,
            'properties', properties
          )
        ), '[]'::jsonb)
      ) as geojson
      FROM (
        SELECT geometry, properties
        FROM layer_feature
        WHERE layer_id = $1
          AND ST_Intersects(
            geometry,
            ST_SetSRID(ST_GeomFromText($2), 4326)
          )
        ORDER BY feature_index
        LIMIT $3
      ) sub;
    `;

    const result = await this.dataSource.query(sql, [layerId, wkt, maxFeatures]);

    const geojson = result[0]?.geojson || { type: 'FeatureCollection', features: [] };

    if (isLimited) {
      this.logger.warn(
        `Layer ${layerId}: Mostrando ${maxFeatures} de ${totalIntersecting} features que intersectan (limitado)`,
      );
    }

    return {
      ...geojson,
      metadata: {
        layerId,
        layerName: layer.name,
        totalIntersecting,
        returned: geojson.features?.length || 0,
        limited: isLimited,
        message: isLimited
          ? `Mostrando ${maxFeatures} de ${totalIntersecting} features que intersectan con la geometría.`
          : undefined,
      },
    };
  }

  /**
   * Obtener features en bounding box (para viewport)
   * MEJORADO: Con límite de features y simplificación
   */
  async getLayerFeaturesInBBox(
    layerId: number,
    bounds: {
      minLon: number;
      minLat: number;
      maxLon: number;
      maxLat: number;
    },
    maxFeatures: number = 5000,
    simplify: boolean = true,
    userId?: number,
  ): Promise<any> {
    const layer = await this.layerRepository.findOne({
      where: { id: layerId, isActive: true },
    });

    if (!layer) {
      throw new NotFoundException(`Capa con ID ${layerId} no encontrada`);
    }

    // if (!this.canUserAccessLayer(layer, userId)) {
    //   throw new ForbiddenException(
    //     'No tienes permiso para acceder a esta capa',
    //   );
    // }

    // Primero contar cuántos features hay en el bbox
    const countResult = await this.dataSource.query(
      `
      SELECT COUNT(*) as count
      FROM layer_feature
      WHERE layer_id = $1
        AND ST_Intersects(
          geometry,
          ST_MakeEnvelope($2, $3, $4, $5, 4326)
        )
      `,
      [layerId, bounds.minLon, bounds.minLat, bounds.maxLon, bounds.maxLat],
    );

    const totalInBounds = parseInt(countResult[0]?.count || '0');
    const isLimited = totalInBounds > maxFeatures;

    // Debug: verificar si hay features en la capa
    const totalFeaturesInLayer = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM layer_feature WHERE layer_id = $1`,
      [layerId],
    );
    
    this.logger.debug(
      `Layer ${layerId}: Total features=${totalFeaturesInLayer[0]?.count}, ` +
      `In bbox=${totalInBounds}, Bounds=[${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}]`
    );

    // Query con límite y simplificación opcional
    const sql = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(${
              simplify
                ? 'ST_SimplifyPreserveTopology(geometry, 0.0001)'
                : 'geometry'
            })::jsonb,
            'properties', properties
          )
        ), '[]'::jsonb)
      ) as geojson
      FROM (
        SELECT geometry, properties
        FROM layer_feature
        WHERE layer_id = $1
          AND ST_Intersects(
            geometry,
            ST_MakeEnvelope($2, $3, $4, $5, 4326)
          )
        ORDER BY feature_index
        LIMIT $6
      ) sub;
    `;

    const result = await this.dataSource.query(sql, [
      layerId,
      bounds.minLon,
      bounds.minLat,
      bounds.maxLon,
      bounds.maxLat,
      maxFeatures,
    ]);

    const geojson = result[0]?.geojson || { type: 'FeatureCollection', features: [] };

    // Agregar metadata sobre limitación
    if (isLimited) {
      this.logger.warn(
        `Layer ${layerId}: Mostrando ${maxFeatures} de ${totalInBounds} features en bbox (limitado)`,
      );
    }

    return {
      ...geojson,
      metadata: {
        totalInBounds,
        returned: geojson.features?.length || 0,
        limited: isLimited,
        message: isLimited
          ? `Mostrando ${maxFeatures} de ${totalInBounds} features. Haz zoom para ver más detalles.`
          : undefined,
      },
    };
  }

  /**
   * Verificar si usuario puede acceder a la capa
   */
  private canUserAccessLayer(layer: Layer, userId?: number): boolean {
    // Capa pública
    if (layer.isPublic) {
      return true;
    }

    if (!userId) {
      return false;
    }

    if (layer.userId === userId) {
      return true;
    }

    if (layer.sharedWith && layer.sharedWith.includes(userId)) {
      return true;
    }

    return false;
  }

  /**
   * Obtener TODAS las capas activas (con paginación)
   */
  async getAllLayers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [layers, total] = await this.layerRepository.findAndCount({
      where: {
        isActive: true,
      },
      relations: ['user'],
      select: [
        'id',
        'name',
        'description',
        'layerType',
        'totalFeatures',
        'isPublic',
        'style',
        'originalFilename',
        'fileSizeBytes',
        'createdAt',
        'updatedAt',
      ],
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    });

    return {
      data: layers.map((layer) => ({
        ...layer,
        user: layer.user
          ? {
              id: layer.user.id,
              firstName: layer.user.firstName,
              lastName: layer.user.lastName,
              email: layer.user.email,
            }
          : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Listar capas del usuario
   */
  async getUserLayers(userId: number) {
    return this.layerRepository.find({
      where: { userId, isActive: true },
      select: [
        'id',
        'name',
        'description',
        'layerType',
        'totalFeatures',
        'isPublic',
        'style',
        'originalFilename',
        'fileSizeBytes',
        'createdAt',
        'updatedAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Listar capas públicas
   */
  async getPublicLayers(page: number = 1, limit: number = 20) {
    const [layers, total] = await this.layerRepository.findAndCount({
      where: { isPublic: true, isActive: true },
      select: [
        'id',
        'name',
        'description',
        'layerType',
        'totalFeatures',
        'style',
        'createdAt',
      ],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: layers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtener detalles de una capa
   */
  async getLayerById(layerId: number, userId?: number) {
    console.log({layerId})
    const layer = await this.layerRepository.findOne({
      where: { id: layerId, isActive: true },
      relations: ['user'],
    });

    if (!layer) {
      throw new NotFoundException(`Capa con ID ${layerId} no encontrada`);
    }

    // if (!this.canUserAccessLayer(layer, userId)) {
    //   throw new ForbiddenException('No tienes acceso a esta capa');
    // }

    // ? Obtener bbox como GeoJSON
    let bboxGeoJson = null;
    if (layer.bboxGeometry) {
      const result = await this.dataSource.query(
        `SELECT ST_AsGeoJSON($1)::jsonb as bbox`,
        [layer.bboxGeometry],
      );
      bboxGeoJson = result[0]?.bbox;
    }

    return {
      ...layer,
      bboxGeometry: bboxGeoJson,
      user: layer.user
        ? {
            id: layer.user.id,
            firstName: layer.user.firstName,
            lastName: layer.user.lastName,
            email: layer.user.email,
          }
        : null,
    };
  }

  /**
   * Actualizar metadata de una capa
   * MEJORADO: Permite cambiar/crear/eliminar relaciones map-layer
   */
  async updateLayer(layerId: number, userId: number, dto: UpdateLayerDto) {
    const layer = await this.layerRepository.findOne({
      where: { id: layerId, isActive: true },
    });

    if (!layer) {
      throw new NotFoundException(
        `La capa con ID "${layerId}" no fue encontrada`,
      );
    }

    // Actualizar campos básicos
    if (dto.name !== undefined) layer.name = dto.name;
    if (dto.description !== undefined) layer.description = dto.description;
    if (dto.isPublic !== undefined) layer.isPublic = dto.isPublic;
    
    // Parsear style si viene como string
    if (dto.style !== undefined) {
      if (typeof dto.style === 'string') {
        try {
          layer.style = JSON.parse(dto.style);
        } catch (error) {
          this.logger.warn(`Failed to parse style JSON: ${error.message}`);
        }
      } else {
        layer.style = dto.style;
      }
    }

    layer.updatedBy = userId;

    await this.layerRepository.save(layer);

    // Manejar cambio de mapa asociado
    if (dto.mapId !== undefined) {
      // Eliminar relaciones existentes
      await this.mapLayerRepository.delete({ layerId });

      // Si mapId no es null, crear nueva relación
      if (dto.mapId !== null) {
        // Verificar que el mapa existe
        const map = await this.mapRepository.findOne({
          where: { id: dto.mapId, isActive: true },
        });

        if (!map) {
          throw new NotFoundException(`Mapa con ID ${dto.mapId} no encontrado`);
        }

        // Obtener el máximo displayOrder actual en ese mapa
        const maxOrderResult = await this.mapLayerRepository
          .createQueryBuilder('ml')
          .select('MAX(ml.display_order)', 'maxOrder')
          .where('ml.map_id = :mapId', { mapId: dto.mapId })
          .getRawOne();

        const nextOrder = (maxOrderResult?.maxOrder ?? -1) + 1;

        // Crear nueva relación
        const mapLayer = this.mapLayerRepository.create({
          mapId: dto.mapId,
          layerId: layerId,
          displayOrder: nextOrder,
          isVisible: true,
          opacity: 1.0,
          createdBy: userId,
        });

        await this.mapLayerRepository.save(mapLayer);

        this.logger.log(
          `Layer ${layerId} asociado al mapa ${dto.mapId} con displayOrder ${nextOrder}`,
        );
      } else {
        this.logger.log(`Relaciones map-layer eliminadas para layer ${layerId}`);
      }
    }

    return {
      id: layer.id,
      name: layer.name,
      description: layer.description,
      isPublic: layer.isPublic,
      style: layer.style,
      mapId: dto.mapId !== undefined ? dto.mapId : undefined,
      updatedAt: layer.updatedAt,
    };
  }

  /**
   * Eliminar capa (soft delete)
   * Elimina también las relaciones map-layer asociadas
   */
  async deleteLayer(layerId: number, userId: number) {
    const layer = await this.layerRepository.findOne({
      where: { id: layerId, isActive: true },
    });

    if (!layer) {
      throw new NotFoundException(
        'Capa no encontrada o no tienes permiso para eliminarla',
      );
    }

    // Eliminar todas las relaciones map-layer antes del soft delete
    const deletedRelations = await this.mapLayerRepository.delete({ layerId });
    
    if (deletedRelations.affected && deletedRelations.affected > 0) {
      this.logger.log(
        `Eliminadas ${deletedRelations.affected} relaciones map-layer para layer ${layerId}`,
      );
    }

    layer.isActive = false;
    layer.updatedBy = userId;
    await this.layerRepository.save(layer);

    return {
      message: 'Capa eliminada exitosamente',
      id: layerId,
      mapRelationsDeleted: deletedRelations.affected || 0,
    };
  }

  /**
   * Compartir capa con otros usuarios
   */
  async shareLayer(
    layerId: number,
    userId: number,
    shareWithUserIds: number[],
  ) {
    const layer = await this.layerRepository.findOne({
      where: { id: layerId, userId, isActive: true },
    });

    if (!layer) {
      throw new NotFoundException(
        'Capa no encontrada o no tienes permiso para compartirla',
      );
    }

    const uniqueIds = [...new Set(shareWithUserIds)];

    const filteredIds = uniqueIds.filter((id) => id !== userId);

    layer.sharedWith = filteredIds;
    layer.updatedBy = userId;
    await this.layerRepository.save(layer);

    return {
      message: 'Capa compartida exitosamente',
      sharedWith: filteredIds,
    };
  }

  /**
   * Obtener estadísticas de las capas del usuario
   */
  async getUserLayerStats(userId?: number) {
    const result = await this.layerRepository
      .createQueryBuilder('layer')
      .select('COUNT(*)', 'totalLayers')
      .addSelect('SUM(layer.total_features)', 'totalFeatures')
      .addSelect('SUM(layer.file_size_bytes)', 'totalSizeBytes')
      .addSelect(
        'COUNT(CASE WHEN layer.is_public = true THEN 1 END)',
        'publicLayers',
      )
      // .where('layer.user_id = :userId', { userId })
      .where('layer.is_active = true')
      .getRawOne();

    return {
      totalLayers: parseInt(result.totalLayers) || 0,
      totalFeatures: parseInt(result.totalFeatures) || 0,
      totalSizeBytes: parseInt(result.totalSizeBytes) || 0,
      totalSizeMB: (parseInt(result.totalSizeBytes) || 0) / (1024 * 1024),
      publicLayers: parseInt(result.publicLayers) || 0,
      privateLayers:
        parseInt(result.totalLayers) - parseInt(result.publicLayers) || 0,
    };
  }

  /**
   * Buscar capas por nombre o descripción
   */
  async searchLayers(
    query: string,
    userId?: number,
    page: number = 1,
    limit: number = 20,
  ) {
    const qb = this.layerRepository
      .createQueryBuilder('layer')
      .where('layer.is_active = true');

    if (userId) {
      qb.andWhere(
        '(layer.is_public = true OR layer.user_id = :userId OR :userId = ANY(layer.shared_with))',
        { userId },
      );
    } else {
      qb.andWhere('layer.is_public = true');
    }

    qb.andWhere('(layer.name ILIKE :query OR layer.description ILIKE :query)', {
      query: `%${query}%`,
    });

    qb.orderBy('layer.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [layers, total] = await qb.getManyAndCount();

    return {
      data: layers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query,
      },
    };
  }

  /**
   * Obtener catálogo de features de una capa multipolygon
   * Retorna lista de features con metadata y bbox individual
   * SOLO PARA CAPAS DE TIPO multipolygon
   */
  async getFeaturesCatalog(layerId: number, userId?: number) {
    const layer = await this.layerRepository.findOne({
      where: { id: layerId, isActive: true },
    });

    if (!layer) {
      throw new NotFoundException(`Capa con ID ${layerId} no encontrada`);
    }

    // Verificar que sea multipolygon
    if (layer.layerType !== 'multipolygon') {
      throw new BadRequestException(
        `Esta funcionalidad solo está disponible para capas de tipo multipolygon. Tipo actual: ${layer.layerType}`,
      );
    }

    // Obtener catálogo de features con bbox individual
    const sql = `
      SELECT 
        lf.id,
        lf.feature_index,
        lf.properties,
        ST_AsGeoJSON(ST_Envelope(lf.geometry))::jsonb as bbox_geometry,
        ST_AsGeoJSON(ST_Centroid(lf.geometry))::jsonb as centroid,
        ST_Area(lf.geometry::geography) / 1000000 as area_km2,
        GeometryType(lf.geometry) as geometry_type
      FROM layer_feature lf
      WHERE lf.layer_id = $1
      ORDER BY lf.feature_index
    `;

    const features = await this.dataSource.query(sql, [layerId]);

    return {
      layerId,
      layerName: layer.name,
      layerType: layer.layerType,
      totalFeatures: features.length,
      features: features.map((f: any) => ({
        id: f.id,
        featureIndex: f.feature_index,
        properties: f.properties,
        bboxGeometry: f.bbox_geometry,
        centroid: f.centroid,
        areaKm2: parseFloat(f.area_km2).toFixed(2),
        geometryType: f.geometry_type,
      })),
    };
  }

  /**
   * Obtener geometrías específicas de features de una capa multipolygon
   * Permite seleccionar features específicas o todas
   * SOLO PARA CAPAS DE TIPO multipolygon
   */
  async getSelectedFeatures(
    layerId: number,
    featureIds?: number[],
    userId?: number,
  ): Promise<any> {
    const layer = await this.layerRepository.findOne({
      where: { id: layerId, isActive: true },
    });

    if (!layer) {
      throw new NotFoundException(`Capa con ID ${layerId} no encontrada`);
    }

    // Verificar que sea multipolygon
    if (layer.layerType !== 'multipolygon') {
      throw new BadRequestException(
        `Esta funcionalidad solo está disponible para capas de tipo multipolygon. Tipo actual: ${layer.layerType}`,
      );
    }

    // Construir query según si hay filtro de IDs o no
    let sql: string;
    let params: any[];

    if (featureIds && featureIds.length > 0) {
      // Obtener solo features específicas
      sql = `
        WITH features_data AS (
          SELECT 
            lf.id,
            lf.feature_index,
            lf.geometry,
            lf.properties
          FROM layer_feature lf
          WHERE lf.layer_id = $1
            AND lf.id = ANY($2::int[])
          ORDER BY lf.feature_index
        )
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                'type', 'Feature',
                'id', fd.id,
                'geometry', ST_AsGeoJSON(fd.geometry)::jsonb,
                'properties', fd.properties || jsonb_build_object(
                  'featureIndex', fd.feature_index,
                  'featureId', fd.id
                )
              )
            ) FROM features_data fd),
            '[]'::jsonb
          )
        ) as geojson
      `;
      params = [layerId, featureIds];
    } else {
      // Obtener todas las features
      sql = `
        WITH features_data AS (
          SELECT 
            lf.id,
            lf.feature_index,
            lf.geometry,
            lf.properties
          FROM layer_feature lf
          WHERE lf.layer_id = $1
          ORDER BY lf.feature_index
        )
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object(
                'type', 'Feature',
                'id', fd.id,
                'geometry', ST_AsGeoJSON(fd.geometry)::jsonb,
                'properties', fd.properties || jsonb_build_object(
                  'featureIndex', fd.feature_index,
                  'featureId', fd.id
                )
              )
            ) FROM features_data fd),
            '[]'::jsonb
          )
        ) as geojson
      `;
      params = [layerId];
    }

    const result = await this.dataSource.query(sql, params);
    const geojson = result[0]?.geojson || { type: 'FeatureCollection', features: [] };

    // Calcular bbox de las features seleccionadas
    let bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null = null;
    
    if (geojson.features && geojson.features.length > 0) {
      let bboxSql: string;
      let bboxParams: any[];

      if (featureIds && featureIds.length > 0) {
        bboxSql = `
          SELECT 
            ST_XMin(ST_Extent(lf.geometry)) as min_lon,
            ST_YMin(ST_Extent(lf.geometry)) as min_lat,
            ST_XMax(ST_Extent(lf.geometry)) as max_lon,
            ST_YMax(ST_Extent(lf.geometry)) as max_lat
          FROM layer_feature lf
          WHERE lf.layer_id = $1
            AND lf.id = ANY($2::int[])
        `;
        bboxParams = [layerId, featureIds];
      } else {
        bboxSql = `
          SELECT 
            ST_XMin(ST_Extent(lf.geometry)) as min_lon,
            ST_YMin(ST_Extent(lf.geometry)) as min_lat,
            ST_XMax(ST_Extent(lf.geometry)) as max_lon,
            ST_YMax(ST_Extent(lf.geometry)) as max_lat
          FROM layer_feature lf
          WHERE lf.layer_id = $1
        `;
        bboxParams = [layerId];
      }

      const bboxResult = await this.dataSource.query(bboxSql, bboxParams);
      
      if (bboxResult[0] && bboxResult[0].min_lon !== null) {
        bbox = {
          minLon: parseFloat(bboxResult[0].min_lon),
          minLat: parseFloat(bboxResult[0].min_lat),
          maxLon: parseFloat(bboxResult[0].max_lon),
          maxLat: parseFloat(bboxResult[0].max_lat),
        };
      }
    }

    return {
      ...geojson,
      metadata: {
        layerId,
        layerName: layer.name,
        totalFeatures: geojson.features?.length || 0,
        selectedFeatureIds: featureIds || 'all',
        bbox: bbox,
      },
    };
  }

  /**
   * Normalizar nombre de propiedad para buscar aliases
   * Ej: "CODDISTRITO" -> "coddistrito", "NO_DISTRIT" -> "coddistrito"
   */
  private normalizePropertyName(propertyName: string): string {
    return propertyName
      .toLowerCase()
      .replace(/[_\-\s]/g, '') // Remover guiones bajos, guiones y espacios
      .replace(/no/g, 'cod') // Convertir "no" a "cod" para aliases
      .replace(/región/g, 'region'); // Normalizar acentos
  }

  /**
   * Verificar si dos nombres de propiedad son equivalentes
   * Ej: "CODDISTRITO" y "NO_DISTRIT" son equivalentes
   */
  private arePropertiesEquivalent(prop1: string, prop2: string): boolean {
    return this.normalizePropertyName(prop1) === this.normalizePropertyName(prop2);
  }

  /**
   * Construir condiciones WHERE dinámicas para filtros de propiedades JSONB
   */
  private buildFilterConditions(
    filters: Record<string, string | string[]>,
    paramOffset: number = 1,
  ): { conditions: string[]; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = paramOffset;

    for (const [filterKey, filterValue] of Object.entries(filters)) {
      if (!filterValue) continue;

      const values = Array.isArray(filterValue) ? filterValue : [filterValue];
      const orConditions: string[] = [];

      // Para cada valor del filtro, buscar en propiedades equivalentes
      for (const value of values) {
        // Limpiar el valor (trim whitespace, newlines, etc.)
        const cleanValue = typeof value === 'string' ? value.trim() : value;
        
        // Crear condición que busque tanto la clave exacta como aliases normalizados
        // Usamos jsonb_each_text para iterar todas las propiedades del feature
        // Usamos TRIM en ambos lados para evitar problemas con espacios/saltos de línea
        orConditions.push(`
          EXISTS (
            SELECT 1 
            FROM jsonb_each_text(lf.properties) AS prop(key, val)
            WHERE (
              prop.key = $${paramIndex}
              OR LOWER(REPLACE(REPLACE(REPLACE(prop.key, '_', ''), '-', ''), ' ', '')) = LOWER(REPLACE(REPLACE(REPLACE($${paramIndex}, '_', ''), '-', ''), ' ', ''))
            )
            AND TRIM(prop.val) = $${paramIndex + 1}
          )
        `);
        params.push(filterKey, cleanValue);
        paramIndex += 2;
      }

      if (orConditions.length > 0) {
        conditions.push(`(${orConditions.join(' OR ')})`);
      }
    }

    return { conditions, params };
  }

  /**
   * Filtrar features de una capa multipolygon por propiedades dinámicas
   * Soporta múltiples filtros y aliases de propiedades
   * SOLO PARA CAPAS DE TIPO multipolygon
   */
  async getFilteredFeatures(
    layerId: number,
    filters?: Record<string, string | string[]>,
    featureIds?: number[],
    userId?: number,
  ): Promise<any> {
    const layer = await this.layerRepository.findOne({
      where: { id: layerId, isActive: true },
    });

    if (!layer) {
      throw new NotFoundException(`Capa con ID ${layerId} no encontrada`);
    }

    if (layer.layerType !== 'multipolygon') {
      throw new BadRequestException(
        `Esta funcionalidad solo está disponible para capas de tipo multipolygon. Tipo actual: ${layer.layerType}`,
      );
    }

    const whereConditions: string[] = ['lf.layer_id = $1'];
    const params: any[] = [layerId];
    let paramIndex = 2;

    if (featureIds && featureIds.length > 0) {
      whereConditions.push(`lf.id = ANY($${paramIndex}::int[])`);
      params.push(featureIds);
      paramIndex++;
    }
    this.logger.debug(`getFilteredFeatures - layerId: ${layerId}, filters:`, JSON.stringify(filters));
    
    if (filters && Object.keys(filters).length > 0) {
      const { conditions, params: filterParams } = this.buildFilterConditions(
        filters,
        paramIndex,
      );
      this.logger.debug(`buildFilterConditions result - conditions:`, conditions);
      this.logger.debug(`buildFilterConditions result - params:`, filterParams);
      whereConditions.push(...conditions);
      params.push(...filterParams);
    }

    const whereClause = whereConditions.join(' AND ');
    this.logger.debug(`Final WHERE clause:`, whereClause);
    this.logger.debug(`Final params:`, params);

    const sql = `
      WITH features_data AS (
        SELECT 
          lf.id,
          lf.feature_index,
          lf.geometry,
          lf.properties
        FROM layer_feature lf
        WHERE ${whereClause}
        ORDER BY lf.feature_index
      )
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'id', fd.id,
              'geometry', ST_AsGeoJSON(fd.geometry)::jsonb,
              'properties', fd.properties || jsonb_build_object(
                'featureIndex', fd.feature_index,
                'featureId', fd.id
              )
            )
          ) FROM features_data fd),
          '[]'::jsonb
        )
      ) as geojson
    `;

    const result = await this.dataSource.query(sql, params);
    const geojson = result[0]?.geojson || { type: 'FeatureCollection', features: [] };

    // Calcular bbox de las features filtradas
    let bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null = null;
    
    if (geojson.features && geojson.features.length > 0) {
      const bboxSql = `
        SELECT 
          ST_XMin(ST_Extent(lf.geometry)) as min_lon,
          ST_YMin(ST_Extent(lf.geometry)) as min_lat,
          ST_XMax(ST_Extent(lf.geometry)) as max_lon,
          ST_YMax(ST_Extent(lf.geometry)) as max_lat
        FROM layer_feature lf
        WHERE ${whereClause}
      `;

      const bboxResult = await this.dataSource.query(bboxSql, params);
      
      if (bboxResult[0] && bboxResult[0].min_lon !== null) {
        bbox = {
          minLon: parseFloat(bboxResult[0].min_lon),
          minLat: parseFloat(bboxResult[0].min_lat),
          maxLon: parseFloat(bboxResult[0].max_lon),
          maxLat: parseFloat(bboxResult[0].max_lat),
        };
      }
    }

    return {
      ...geojson,
      metadata: {
        layerId,
        layerName: layer.name,
        totalFeatures: geojson.features?.length || 0,
        appliedFilters: filters || {},
        selectedFeatureIds: featureIds || 'none',
        bbox: bbox,
      },
    };
  }

  /**
   * Filtrar features de MÚLTIPLES capas con los mismos filtros
   * Busca en todas las capas que tengan propiedades equivalentes
   */
  async getFilteredFeaturesMultipleLayers(
    layerIds: number[],
    filters?: Record<string, string | string[]>,
    userId?: number,
  ): Promise<any> {
    if (!layerIds || layerIds.length === 0) {
      throw new BadRequestException('Debe proporcionar al menos un ID de capa');
    }

    // Obtener todas las capas
    const layers = await this.layerRepository.find({
      where: {
        id: In(layerIds),
        isActive: true,
      },
    });

    if (layers.length === 0) {
      throw new NotFoundException('No se encontraron capas con los IDs proporcionados');
    }

    // Verificar que todas sean multipolygon
    const nonMultipolygonLayers = layers.filter(
      (layer) => layer.layerType !== 'multipolygon',
    );
    if (nonMultipolygonLayers.length > 0) {
      throw new BadRequestException(
        `Las siguientes capas no son de tipo multipolygon: ${nonMultipolygonLayers.map((l) => l.name).join(', ')}`,
      );
    }

    this.logger.debug(`getFilteredFeaturesMultipleLayers - filters:`, JSON.stringify(filters));
    this.logger.debug(`getFilteredFeaturesMultipleLayers - layerIds:`, layerIds);

    // Obtener features filtradas de cada capa
    const results = await Promise.all(
      layers.map(async (layer) => {
        this.logger.debug(`Filtrando capa ${layer.id} (${layer.name}) con filters:`, JSON.stringify(filters));
        const featureCollection = await this.getFilteredFeatures(
          layer.id,
          filters,
          undefined,
          userId,
        );
        this.logger.debug(`Capa ${layer.id}: ${featureCollection.features?.length || 0} features encontradas`);

        // Agregar layerId y layerName a las properties de cada feature
        const featuresWithLayerInfo = (featureCollection.features || []).map((feature: any) => ({
          ...feature,
          properties: {
            ...feature.properties,
            layerId: layer.id,
            layerName: layer.name,
          },
        }));

        return {
          layerId: layer.id,
          layerName: layer.name,
          features: featuresWithLayerInfo,
          totalFeatures: featuresWithLayerInfo.length,
        };
      }),
    );

    // Combinar todas las features en un solo GeoJSON
    const allFeatures = results.flatMap((r) => r.features);

    // Calcular bbox combinado de todas las features
    let bbox: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null = null;
    
    if (allFeatures.length > 0) {
      const sql = `
        WITH all_geometries AS (
          SELECT lf.geometry
          FROM layer_feature lf
          WHERE lf.layer_id = ANY($1::int[])
            ${filters ? 'AND (' + Object.keys(filters).map((_, i) => `
              EXISTS (
                SELECT 1 
                FROM jsonb_each_text(lf.properties) AS prop(key, val)
                WHERE (
                  prop.key = $${i + 2}
                  OR LOWER(REPLACE(REPLACE(REPLACE(prop.key, '_', ''), '-', ''), ' ', '')) = LOWER(REPLACE(REPLACE(REPLACE($${i + 2}, '_', ''), '-', ''), ' ', ''))
                )
                AND prop.val = ANY($${i + 3}::text[])
              )
            `).join(' AND ') + ')' : ''}
        )
        SELECT 
          ST_XMin(ST_Extent(geometry)) as min_lon,
          ST_YMin(ST_Extent(geometry)) as min_lat,
          ST_XMax(ST_Extent(geometry)) as max_lon,
          ST_YMax(ST_Extent(geometry)) as max_lat
        FROM all_geometries
      `;

      const params: any[] = [layerIds];
      
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          const values = Array.isArray(value) ? value : [value];
          params.push(key, values);
        }
      }

      const bboxResult = await this.dataSource.query(sql, params);
      
      if (bboxResult[0] && bboxResult[0].min_lon !== null) {
        bbox = {
          minLon: parseFloat(bboxResult[0].min_lon),
          minLat: parseFloat(bboxResult[0].min_lat),
          maxLon: parseFloat(bboxResult[0].max_lon),
          maxLat: parseFloat(bboxResult[0].max_lat),
        };
      }
    }

    return {
      type: 'FeatureCollection',
      features: allFeatures,
      metadata: {
        totalLayers: layers.length,
        totalFeatures: allFeatures.length,
        appliedFilters: filters || {},
        bbox: bbox,
        layers: results.map((r) => ({
          layerId: r.layerId,
          layerName: r.layerName,
          featuresCount: r.totalFeatures,
        })),
      },
    };
  }
}
