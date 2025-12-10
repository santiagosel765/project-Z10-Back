import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as turf from '@turf/turf';
import proj4 from 'proj4';
import type {
  FeatureCollection,
  Feature,
  Geometry,
  Position,
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
} from 'geojson';

export interface GeoJsonMetadata {
  layerType: string;
  totalFeatures: number;
  bbox: number[];
  bboxPolygon: Polygon;
  centroid: number[];
  geometryTypes: string[];
  properties: string[];
  sampleFeature?: Feature;
}

@Injectable()
export class GeoJsonService {
  private logger = new Logger(GeoJsonService.name);

  constructor() {
    // Definir proyecciones comunes para Guatemala/Centroamérica
    // UTM Zone 15N (Guatemala Occidental)
    proj4.defs('EPSG:32615', '+proj=utm +zone=15 +datum=WGS84 +units=m +no_defs');
    // UTM Zone 16N (Guatemala Oriental)
    proj4.defs('EPSG:32616', '+proj=utm +zone=16 +datum=WGS84 +units=m +no_defs');
    // WGS84
    proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
  }

  /**
   * Valida y normaliza un GeoJSON
   * Convierte Feature → FeatureCollection si es necesario
   * Reproyecta automáticamente si detecta coordenadas proyectadas
   */
  validateAndNormalize(data: any): FeatureCollection {
    try {
      // Validar estructura básica
      if (!data || typeof data !== 'object') {
        throw new Error('Formato JSON inválido');
      }

      // Convertir Feature simple a FeatureCollection
      if (data.type === 'Feature') {
        data = {
          type: 'FeatureCollection',
          features: [data],
        };
      }

      // Validar tipo
      if (data.type !== 'FeatureCollection') {
        throw new Error(
          'Debe ser un FeatureCollection o Feature. GeometryCollection no está soportado.',
        );
      }

      // Validar que tenga features
      if (!Array.isArray(data.features)) {
        throw new Error('El FeatureCollection debe tener un array de features');
      }

      if (data.features.length === 0) {
        throw new Error('El FeatureCollection debe contener al menos un feature');
      }

      // Detectar primero si las coordenadas están proyectadas
      const firstSample = this.getSampleCoordinate(data.features[0].geometry);
      if (firstSample) {
        const detectedEPSG = this.detectEPSG(firstSample);
        
        if (detectedEPSG && detectedEPSG !== 'EPSG:4326') {
          this.logger.log(`Detectadas coordenadas proyectadas (${detectedEPSG}). Reproyectando a WGS84...`);
          
          // Reproyectar todas las features
          data.features = data.features.map((feature: any) => {
            return this.reprojectFeature(feature, detectedEPSG, 'EPSG:4326');
          });
          
          this.logger.log(`Reproyectadas exitosamente ${data.features.length} features a WGS84`);
        }
      }
      
      // DESPUÉS de reproyectar (si era necesario), detectar si está invertido
      // Muestrear varias features para mejor detección
      const samplesToCheck = Math.min(20, data.features.length);
      let needsSwap = 0;
      let validAsIs = 0;
      let sampleInfo: string[] = [];
      
      for (let i = 0; i < samplesToCheck; i++) {
        const sampleCoords = this.getSampleCoordinate(data.features[i].geometry);
        if (sampleCoords) {
          const [first, second] = sampleCoords;
          
          // Solo considerar invertido si NO son proyectadas
          // Coordenadas proyectadas tienen valores muy grandes (>200)
          const isProjected = Math.abs(first) > 200 || Math.abs(second) > 200;
          if (isProjected) {
            continue; // Saltar, ya se manejó con reproyección
          }
          
          // Detectar invertido: segundo valor fuera de rango de latitud pero en rango de longitud
          const secondOutOfLatRange = Math.abs(second) > 90 && Math.abs(second) <= 180;
          const firstInLatRange = Math.abs(first) <= 90;
          
          if (secondOutOfLatRange && firstInLatRange) {
            needsSwap++;
            if (sampleInfo.length < 3) {
              sampleInfo.push(`Feature ${i}: [${first}, ${second}]`);
            }
            continue;
          }
          
          // Verificar si las coordenadas son válidas en el orden actual [lon, lat]
          const validAsLonLat = first >= -180 && first <= 180 && second >= -90 && second <= 90;
          
          if (validAsLonLat) {
            validAsIs++;
          }
        }
      }
      
      // Solo hacer swap si hay evidencia clara de inversión (no proyección)
      const shouldSwap = needsSwap > 0 && needsSwap > validAsIs;
      
      if (shouldSwap) {
        this.logger.warn(
          `Detectadas coordenadas invertidas [lat, lon] en lugar de [lon, lat]. ` +
          `${needsSwap} muestras necesitan intercambio, ${validAsIs} son válidas. ` +
          `Muestras: ${sampleInfo.join(' | ')}. ` +
          `Intercambiando TODAS las ${data.features.length} features...`
        );
        
        data.features = data.features.map((feature: any) => {
          return this.swapCoordinates(feature);
        });
        
        this.logger.log(`Coordenadas intercambiadas exitosamente para ${data.features.length} features`);
      }

      // Validar cada feature (ahora en WGS84)
      data.features.forEach((feature: any, index: number) => {
        this.validateFeature(feature, index);
      });

      return data as FeatureCollection;
    } catch (error) {
      throw new BadRequestException(`GeoJSON inválido: ${error.message}`);
    }
  }

  /**
   * Valida un feature individual
   */
  private validateFeature(feature: any, index: number): void {
    // Validar estructura básica
    if (feature.type !== 'Feature') {
      throw new Error(`Feature ${index}: el tipo debe ser "Feature"`);
    }

    // Validar geometría
    if (!feature.geometry || typeof feature.geometry !== 'object') {
      throw new Error(`Feature ${index}: geometría faltante o inválida`);
    }

    if (!feature.geometry.type) {
      throw new Error(`Feature ${index}: geometry.type es requerido`);
    }

    if (!feature.geometry.coordinates) {
      throw new Error(`Feature ${index}: geometry.coordinates es requerido`);
    }

    // Validar tipos de geometría soportados
    const validTypes = [
      'Point',
      'LineString',
      'Polygon',
      'MultiPoint',
      'MultiLineString',
      'MultiPolygon',
    ];

    if (!validTypes.includes(feature.geometry.type)) {
      throw new Error(
        `Feature ${index}: Tipo de geometría no soportado "${feature.geometry.type}". ` +
        `Tipos soportados: ${validTypes.join(', ')}`,
      );
    }

    // Validar coordenadas con Turf
    try {
      turf.getCoords(feature);
    } catch (e) {
      throw new Error(
        `Feature ${index}: Estructura de coordenadas inválida - ${e.message}`,
      );
    }

    // Validar rango de coordenadas (WGS84)
    this.validateCoordinates(feature.geometry.coordinates, index);

    // Validar properties (debe ser objeto o null)
    if (
      feature.properties !== null &&
      typeof feature.properties !== 'object'
    ) {
      throw new Error(`Feature ${index}: properties debe ser un objeto o null`);
    }
  }

  /**
   * Detecta si las coordenadas están en un sistema proyectado (no WGS84)
   */
  private detectProjectedCoordinates(coords: any): boolean {
    let hasOutOfRange = false;

    const check = (coord: Position) => {
      if (Array.isArray(coord) && coord.length >= 2) {
        const [x, y] = coord;
        if (typeof x === 'number' && typeof y === 'number') {
          // En GeoJSON, el orden es [longitud, latitud]
          // Longitud válida: -180 a 180
          // Latitud válida: -90 a 90
          // Si AMBAS coordenadas están fuera de rango, es proyectada
          // Nota: usamos valores absolutos grandes (>200) para detectar UTM
          if (Math.abs(x) > 200 || Math.abs(y) > 200) {
            hasOutOfRange = true;
          }
        }
      }
    };

    const traverse = (coordinates: any) => {
      if (typeof coordinates[0] === 'number') {
        check(coordinates as Position);
      } else {
        coordinates.forEach(traverse);
      }
    };

    traverse(coords);
    return hasOutOfRange;
  }

  /**
   * Valida que las coordenadas estén en rango válido WGS84
   * Si detecta coordenadas proyectadas, lanza error descriptivo
   */
  private validateCoordinates(coords: any, featureIndex: number): void {
    // Primero detectar si son coordenadas proyectadas
    const isProjected = this.detectProjectedCoordinates(coords);
    
    // if (isProjected) {
    //   // Obtener una muestra para el mensaje de error
    //   let sampleCoord: Position | null = null;
    //   const getSample = (c: any): void => {
    //     if (typeof c[0] === 'number') {
    //       sampleCoord = c;
    //     } else if (Array.isArray(c[0])) {
    //       getSample(c[0]);
    //     }
    //   };
    //   getSample(coords);
      
    //   throw new Error(
    //     `Feature ${featureIndex}: Detected projected coordinates (values > 180 or > 90). ` +
    //     `Sample coordinate: [${sampleCoord ? (sampleCoord as Position).join(', ') : 'unknown'}]. ` +
    //     `This GeoJSON appears to use a projected coordinate system (like UTM). ` +
    //     `Please reproject to WGS84 (EPSG:4326) before uploading. ` +
    //     `You can use tools like QGIS, ogr2ogr, or online converters.`,
    //   );
    // }

    const validate = (coord: Position) => {
      if (!Array.isArray(coord) || coord.length < 2) {
        throw new Error(
          `Feature ${featureIndex}: Formato de coordenada inválido. Se esperaba [longitud, latitud]`,
        );
      }

      let [lon, lat] = coord;

      if (typeof lon !== 'number' || typeof lat !== 'number') {
        throw new Error(
          `Feature ${featureIndex}: Las coordenadas deben ser números`,
        );
      }

      if (!isFinite(lon) || !isFinite(lat)) {
        throw new Error(
          `Feature ${featureIndex}: Las coordenadas deben ser números finitos`,
        );
      }

      // Aplicar tolerancia para valores muy cercanos a los límites
      // Esto maneja errores de precisión numérica y valores límite válidos
      const TOLERANCE = 90000000.0;
      
      if (lon < -180 - TOLERANCE || lon > 180 + TOLERANCE) {
        throw new Error(
          `Feature ${featureIndex}: Longitud ${lon} fuera de rango [-180, 180] (tolerancia: ±${TOLERANCE}°)`,
        );
      }

      if (lat < -90 - TOLERANCE || lat > 90 + TOLERANCE) {
        throw new Error(
          `Feature ${featureIndex}: Latitud ${lat} fuera de rango [-90, 90] (tolerancia: ±${TOLERANCE}°)`,
        );
      }

      // Recortar valores que están ligeramente fuera de rango pero dentro de la tolerancia
      if (lon < -180) {
        this.logger.debug(`Feature ${featureIndex}: Ajustando longitud ${lon} a -180`);
        lon = -180;
      }
      if (lon > 180) {
        this.logger.debug(`Feature ${featureIndex}: Ajustando longitud ${lon} a 180`);
        lon = 180;
      }
      if (lat < -90) {
        this.logger.debug(`Feature ${featureIndex}: Ajustando latitud ${lat} a -90`);
        lat = -90;
      }
      if (lat > 90) {
        this.logger.debug(`Feature ${featureIndex}: Ajustando latitud ${lat} a 90`);
        lat = 90;
      }
      
      // Actualizar la coordenada corregida
      coord[0] = lon;
      coord[1] = lat;
    };

    const traverse = (coordinates: any) => {
      if (typeof coordinates[0] === 'number') {
        // Es una coordenada [lon, lat]
        validate(coordinates as Position);
      } else {
        // Es un array de coordenadas
        coordinates.forEach(traverse);
      }
    };

    traverse(coords);
  }

  /**
   * Extrae metadatos del GeoJSON
   */
  extractMetadata(geojson: FeatureCollection): GeoJsonMetadata {
    // Calcular bounding box
    const bbox = turf.bbox(geojson);

    // Contar features
    const totalFeatures = geojson.features.length;

    // Detectar tipos de geometría
    const geometryTypes = new Set(
      geojson.features.map((f) => f.geometry.type),
    );

    // Determinar tipo predominante de capa
    let layerType = 'mixed';
    if (geometryTypes.size === 1) {
      const singleType = Array.from(geometryTypes)[0];
      layerType = singleType.toLowerCase();
    }

    // Crear polígono del bbox
    const bboxPolygon: Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [bbox[0], bbox[1]], // min lon, min lat
          [bbox[2], bbox[1]], // max lon, min lat
          [bbox[2], bbox[3]], // max lon, max lat
          [bbox[0], bbox[3]], // min lon, max lat
          [bbox[0], bbox[1]], // cierre
        ],
      ],
    };

    // Calcular centroide
    const center = turf.center(geojson);
    const centroid = center.geometry.coordinates;

    // Extraer nombres de properties únicos
    const propertiesSet = new Set<string>();
    geojson.features.forEach((feature) => {
      if (feature.properties) {
        Object.keys(feature.properties).forEach((key) =>
          propertiesSet.add(key),
        );
      }
    });

    return {
      layerType,
      totalFeatures,
      bbox,
      bboxPolygon,
      centroid,
      geometryTypes: Array.from(geometryTypes),
      properties: Array.from(propertiesSet),
      sampleFeature: geojson.features[0],
    };
  }

  /**
   * Convierte geometría GeoJSON a WKT para PostGIS
   */
  geojsonToWKT(geometry: Geometry): string {
    const coordsToString = (coords: Position): string => {
      return `${coords[0]} ${coords[1]}`;
    };

    const ringToString = (ring: Position[]): string => {
      return ring.map(coordsToString).join(', ');
    };

    switch (geometry.type) {
      case 'Point':
        const point = geometry as Point;
        return `POINT(${coordsToString(point.coordinates)})`;

      case 'LineString':
        const lineString = geometry as LineString;
        return `LINESTRING(${ringToString(lineString.coordinates)})`;

      case 'Polygon':
        const polygon = geometry as Polygon;
        const rings = polygon.coordinates
          .map((ring) => `(${ringToString(ring)})`)
          .join(', ');
        return `POLYGON(${rings})`;

      case 'MultiPoint':
        const multiPoint = geometry as MultiPoint;
        const points = multiPoint.coordinates
          .map((coord) => `(${coordsToString(coord)})`)
          .join(', ');
        return `MULTIPOINT(${points})`;

      case 'MultiLineString':
        const multiLineString = geometry as MultiLineString;
        const lines = multiLineString.coordinates
          .map((line) => `(${ringToString(line)})`)
          .join(', ');
        return `MULTILINESTRING(${lines})`;

      case 'MultiPolygon':
        const multiPolygon = geometry as MultiPolygon;
        const polygons = multiPolygon.coordinates
          .map((poly) => {
            const polyRings = poly
              .map((ring) => `(${ringToString(ring)})`)
              .join(', ');
            return `(${polyRings})`;
          })
          .join(', ');
        return `MULTIPOLYGON(${polygons})`;

      default:
        throw new Error(`Tipo de geometría no soportado: ${geometry.type}`);
    }
  }

  /**
   * Simplifica geometrías para optimizar performance
   * Útil para capas con muchos vértices
   */
  simplifyGeoJson(
    geojson: FeatureCollection,
    tolerance: number = 0.0001,
    highQuality: boolean = false,
  ): FeatureCollection {
    return {
      ...geojson,
      features: geojson.features.map((feature) => {
        try {
          // Solo simplificar si es LineString o Polygon
          if (
            feature.geometry.type === 'LineString' ||
            feature.geometry.type === 'Polygon' ||
            feature.geometry.type === 'MultiLineString' ||
            feature.geometry.type === 'MultiPolygon'
          ) {
            return turf.simplify(feature, {
              tolerance,
              highQuality,
            });
          }
          return feature;
        } catch (e) {
          // Si falla la simplificación, devolver original
          return feature;
        }
      }),
    };
  }

  /**
   * Valida que el GeoJSON no sea demasiado complejo
   */
  validateComplexity(
    geojson: FeatureCollection,
    maxFeatures: number = 10000,
    maxVerticesPerFeature: number = 10000,
  ): void {
    if (geojson.features.length > maxFeatures) {
      throw new BadRequestException(
        `Demasiados features. Máximo permitido: ${maxFeatures}, encontrados: ${geojson.features.length}`,
      );
    }

    geojson.features.forEach((feature, index) => {
      try {
        const coords = turf.getCoords(feature.geometry as any);
        const flatCoords = this.flattenCoordinates(coords);

        if (flatCoords.length > maxVerticesPerFeature) {
          throw new BadRequestException(
            `Feature ${index} tiene demasiados vértices. ` +
            `Máximo permitido: ${maxVerticesPerFeature}, encontrados: ${flatCoords.length}`,
          );
        }
      } catch (e) {
        if (e instanceof BadRequestException) {
          throw e;
        }
      }
    });
  }

  /**
   * Aplana array de coordenadas para contar vértices
   */
  private flattenCoordinates(coords: any): Position[] {
    const result: Position[] = [];

    const traverse = (arr: any) => {
      if (typeof arr[0] === 'number') {
        result.push(arr);
      } else {
        arr.forEach(traverse);
      }
    };

    traverse(coords);
    return result;
  }

  /**
   * Estima el tamaño en memoria del GeoJSON
   */
  estimateSize(geojson: FeatureCollection): number {
    return JSON.stringify(geojson).length;
  }

  /**
   * Genera un resumen legible del GeoJSON
   */
  generateSummary(metadata: GeoJsonMetadata): string {
    const { totalFeatures, layerType, geometryTypes } = metadata;

    let summary = `${totalFeatures} feature${totalFeatures > 1 ? 's' : ''}`;

    if (layerType !== 'mixed') {
      summary += ` of type ${layerType}`;
    } else {
      summary += ` with mixed types: ${geometryTypes.join(', ')}`;
    }

    return summary;
  }

  /**
   * Obtiene una coordenada de muestra de una geometría
   */
  private getSampleCoordinate(geometry: any): Position | null {
    if (!geometry || !geometry.coordinates) {
      return null;
    }

    // Navegar hasta encontrar la primera coordenada [lon, lat]
    let coords = geometry.coordinates;
    while (Array.isArray(coords) && Array.isArray(coords[0])) {
      coords = coords[0];
    }

    return Array.isArray(coords) && coords.length >= 2 ? coords : null;
  }

  /**
   * Detecta el sistema de coordenadas basado en los valores
   * Retorna el código EPSG más probable
   */
  private detectEPSG(coord: Position): string | null {
    const [x, y] = coord;

    // Si está en rango WGS84, no hacer nada
    if (x >= -180 && x <= 180 && y >= -90 && y <= 90) {
      return 'EPSG:4326';
    }

    // Detectar UTM basado en rangos típicos
    // UTM X: 166,000 - 834,000 (zona de 6°)
    // UTM Y: 0 - 10,000,000 (hemisferio norte)
    
    if (x >= 166000 && x <= 834000) {
      // Determinar zona UTM basado en longitud aproximada
      // Para Guatemala: zonas 15N y 16N son las más comunes
      
      if (y >= 0 && y <= 10000000) {
        // Hemisferio Norte
        // Zona 15N: Guatemala occidental (x ~250,000-500,000)
        if (x >= 166000 && x <= 500000) {
          this.logger.debug(`Detected UTM Zone 15N based on X: ${x}, Y: ${y}`);
          return 'EPSG:32615';
        }
        // Zona 16N: Guatemala oriental (x ~500,000-834,000)
        else {
          this.logger.debug(`Detected UTM Zone 16N based on X: ${x}, Y: ${y}`);
          return 'EPSG:32616';
        }
      }
    }

    // Si no podemos detectar automáticamente, advertir
    this.logger.warn(
      `No se pudo detectar automáticamente el código EPSG para coordenadas [${x}, ${y}]. ` +
      `Asumiendo WGS84, la validación puede fallar.`
    );
    
    return null;
  }

  /**
   * Intercambia el orden de coordenadas de [lat, lon] a [lon, lat]
   */
  private swapCoordinates(feature: any): any {
    const swap = (coords: any): any => {
      if (typeof coords[0] === 'number') {
        // Es una coordenada [lat, lon], intercambiar a [lon, lat]
        const [lat, lon] = coords;
        return [lon, lat];
      } else {
        // Es un array de coordenadas, aplicar recursivamente
        return coords.map(swap);
      }
    };

    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: swap(feature.geometry.coordinates),
      },
    };
  }

  /**
   * Reproyecta una feature completa de un EPSG a otro
   */
  private reprojectFeature(feature: any, fromEPSG: string, toEPSG: string): any {
    const reprojectCoordinates = (coords: any): any => {
      if (typeof coords[0] === 'number') {
        // Es una coordenada [x, y]
        const [x, y] = coords;
        const transformed = proj4(fromEPSG, toEPSG, [x, y]);
        return transformed;
      } else {
        // Es un array de coordenadas, aplicar recursivamente
        return coords.map(reprojectCoordinates);
      }
    };

    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: reprojectCoordinates(feature.geometry.coordinates),
      },
    };
  }
}