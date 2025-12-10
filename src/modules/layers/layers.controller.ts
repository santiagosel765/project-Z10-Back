import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Res,
  StreamableFile,
  Query,
  BadRequestException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { LayersService } from './layers.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadLayerDto } from './dto/upload-layer.dto';
import { UpdateLayerDto } from './dto/update-layer.dto';
import type { Response } from 'express';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/auth/jwt.guard';


@UseGuards(JwtAuthGuard)
@Controller('layers')
export class LayersController {

  private logger: Logger = new Logger(LayersController.name);

  constructor(private readonly layersService: LayersService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() uploadLayerDto: UploadLayerDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    this.logger.log("")
    return this.layersService.createLayerFromGeoJson(
      file.buffer,
      uploadLayerDto,
      uploadLayerDto.userId,
      file.originalname,
    );
  }

  
  @Get('all')
  @ApiOperation({
    summary: 'Obtener todas las capas',
    description: `
      Obtiene todas las capas activas del sistema (acceso admin/público).
      
      **Retorna:**
      - Lista de todas las capas con metadata
      - Información del propietario incluida
      - Soporte de paginación
      - Ordenadas por fecha de creación (más recientes primero)
      
      **Casos de uso:**
      - Dashboard de administrador
      - Catálogo de capas
      - Vista general del sistema
    `,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of all layers',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Puntos de Interés' },
              description: { type: 'string' },
              layerType: { type: 'string', example: 'point' },
              totalFeatures: { type: 'number', example: 150 },
              isPublic: { type: 'boolean' },
              style: { type: 'object' },
              originalFilename: { type: 'string' },
              fileSizeBytes: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  async getAllLayers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.layersService.getAllLayers(page, limit);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener capas del usuario',
    description: `
      Obtiene todas las capas del usuario autenticado.
      
      **Retorna:**
      - Lista de capas con metadata básica
      - Ordenadas por fecha de creación (más recientes primero)
      - No incluye datos de features (solo metadata)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'List of user layers',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          name: { type: 'string', example: 'Puntos de Interés' },
          description: { type: 'string', example: 'Lugares importantes' },
          layerType: { type: 'string', example: 'point' },
          totalFeatures: { type: 'number', example: 150 },
          isPublic: { type: 'boolean', example: false },
          style: { type: 'object' },
          originalFilename: { type: 'string', example: 'data.geojson' },
          fileSizeBytes: { type: 'number', example: 1024000 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getUserLayers(
    @GetUser() user?: any,
  )
  {
    const userId = user.userId;
    return this.layersService.getUserLayers(userId);
  }

  @Get('public')
  @ApiOperation({
    summary: 'Obtener capas públicas',
    description: `
      Obtiene todas las capas disponibles públicamente.
      
      **Características:**
      - No requiere autenticación
      - Soporte de paginación
      - Ordenadas por fecha de creación (más recientes primero)
    `,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of public layers',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              description: { type: 'string' },
              layerType: { type: 'string' },
              totalFeatures: { type: 'number' },
              style: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  async getPublicLayers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.layersService.getPublicLayers(page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalles de una capa',
    description: `
      Obtiene información detallada sobre una capa específica.
      
      **Retorna:**
      - Metadata de la capa
      - Bounding box como GeoJSON
      - Información del propietario (limitada)
      - NO incluye features (usar endpoint /geojson)
      
      **Acceso:**
      - Capas públicas: Cualquiera
      - Capas privadas: Solo propietario
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Layer ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Layer details',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Puntos de Interés' },
        description: { type: 'string' },
        userId: { type: 'number' },
        layerType: { type: 'string', example: 'point' },
        totalFeatures: { type: 'number', example: 150 },
        bboxGeometry: {
          type: 'object',
          description: 'Bounding box as GeoJSON Polygon',
        },
        style: { type: 'object' },
        isActive: { type: 'boolean' },
        isPublic: { type: 'boolean' },
        sharedWith: { type: 'array', items: { type: 'number' } },
        originalFilename: { type: 'string' },
        fileSizeBytes: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Layer not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getLayerById(
    @Param('id', ParseIntPipe) id: number,
  ) {
   
    return this.layersService.getLayerById(id);
  }

  @Get(':id/geojson')
  @ApiOperation({
    summary: 'Obtener capa como GeoJSON',
    description: `
      Obtiene la capa completa como un FeatureCollection GeoJSON válido.
      
      **Retorna:**
      - GeoJSON completo con todos los features
      - Todas las propiedades de los features
      - Geometrías en WGS84 (EPSG:4326)
      
      **Casos de uso:**
      - Mostrar capa completa en el mapa
      - Exportar datos de la capa
      - Descarga para uso offline
      
      **Rendimiento:**
      - Puede ser lento para capas grandes (>5000 features)
      - Considerar usar /geojson/bbox para consultas de viewport
      
      **Acceso:**
      - Capas públicas: Cualquiera
      - Capas privadas: Propietario y usuarios compartidos
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Layer ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Complete GeoJSON FeatureCollection',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'FeatureCollection' },
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'Feature' },
              geometry: {
                type: 'object',
                properties: {
                  type: { type: 'string', example: 'Point' },
                  coordinates: {
                    type: 'array',
                    items: { type: 'number' },
                    example: [-90.5089, 14.5965],
                  },
                },
              },
              properties: {
                type: 'object',
                example: {
                  name: 'Hospital Roosevelt',
                  type: 'hospital',
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Layer not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getLayerGeoJson(
    @Param('id', ParseIntPipe) id: number,

  ) {
    return this.layersService.getLayerAsGeoJson(id);
  }

  @Get(':id/geojson/download')
  async downloadLayerGeoJson(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {

    const layer = await this.layersService.getLayerById(id);
    const geojson = await this.layersService.getLayerAsGeoJson(id);

    const sanitizedName = layer.name
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .substring(0, 50); // Limitar longitud

    const filename = `${sanitizedName}_${layer.id}.geojson`;

    const buffer = Buffer.from(JSON.stringify(geojson, null, 2), 'utf-8');

    // ? Headers para descarga
    res.set({
      'Content-Type': 'application/geo+json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-cache',
    });

    return new StreamableFile(buffer);
  }

  @Get('search')
  async searchLayers(
    @Query('q') query: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @GetUser() user?: any,
  ) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query is required');
    }

    const userId = user.userId;
    return this.layersService.searchLayers(query, userId, page, limit);
  }

  @Get(':id/features/catalog')
  @ApiOperation({
    summary: 'Obtener catálogo de features de una capa multipolygon',
    description: `
      **SOLO PARA CAPAS MULTIPOLYGON**
      
      Retorna un catálogo listado de todas las features de una capa multipolygon con:
      - ID y índice de cada feature
      - Propiedades (nombre, código, etc.)
      - BBox individual calculado para cada feature
      - Centroide de cada feature
      - Área en km²
      - Tipo de geometría
      
      **Caso de uso:**
      Este endpoint está diseñado para capas grandes de multipolígonos (como países, estados, municipios)
      donde se necesita mostrar un listado/catálogo en el frontend para que el usuario seleccione
      qué features específicas desea visualizar en el mapa, sin tener que cargar todas las geometrías.
      
      **Flujo recomendado:**
      1. Llamar este endpoint para obtener el catálogo
      2. Mostrar lista en UI con nombres y metadatos
      3. Usuario selecciona features específicas
      4. Llamar a GET /layers/:id/features?featureIds=1,5,10 para obtener solo las geometrías seleccionadas
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la capa multipolygon' })
  @ApiResponse({
    status: 200,
    description: 'Catálogo de features obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        layerId: { type: 'number' },
        layerName: { type: 'string' },
        layerType: { type: 'string' },
        totalFeatures: { type: 'number' },
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              featureIndex: { type: 'number' },
              properties: { type: 'object' },
              bboxGeometry: { type: 'object' },
              centroid: { type: 'object' },
              areaKm2: { type: 'string' },
              geometryType: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'La capa no es de tipo multipolygon' })
  @ApiResponse({ status: 404, description: 'Capa no encontrada' })
  async getFeaturesCatalog(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user?: any,
  ) {
    const userId = user?.userId;
    return this.layersService.getFeaturesCatalog(id, userId);
  }

  @Get(':id/features/filter')
  @ApiOperation({
    summary: 'Filtrar features de una capa multipolygon por propiedades',
    description: `
      **SOLO PARA CAPAS MULTIPOLYGON**
      
      Permite filtrar features por propiedades dinámicas con soporte para aliases.
      
      **Soporte de aliases automático:**
      El sistema detecta propiedades equivalentes aunque tengan nombres diferentes:
      - CODDISTRITO = NO_DISTRIT = Cod_Distrito
      - CODREGION = No_REGIÓN = Cod_Region
      - etc. (ignora guiones bajos, guiones, espacios y mayúsculas)
      
      **Ejemplos de uso:**
      
      1. Filtrar por un distrito:
         \`GET /layers/123/features/filter?CODDISTRITO=5\`
         
      2. Filtrar por múltiples distritos (usar comas):
         \`GET /layers/123/features/filter?CODDISTRITO=5,10,15\`
         
      3. Filtrar por distrito Y región:
         \`GET /layers/123/features/filter?CODDISTRITO=5&CODREGION=2\`
         
      4. Combinar con IDs específicos:
         \`GET /layers/123/features/filter?CODDISTRITO=5&featureIds=1&featureIds=5\`
      
      **Respuesta:**
      GeoJSON FeatureCollection con solo las features que cumplen los filtros.
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la capa multipolygon' })
  @ApiQuery({
    name: 'CODDISTRITO',
    required: false,
    description: 'Filtrar por código de distrito. Valores múltiples separados por coma.',
    example: '5',
  })
  @ApiQuery({
    name: 'CODREGION',
    required: false,
    description: 'Filtrar por código de región. Valores múltiples separados por coma.',
    example: '2',
  })
  @ApiQuery({
    name: 'featureIds',
    required: false,
    type: [Number],
    description: 'IDs específicos de features (se combina con filters usando AND)',
    example: [1, 5, 10],
  })
  @ApiResponse({
    status: 200,
    description: 'Features filtradas obtenidas exitosamente',
  })
  @ApiResponse({ status: 400, description: 'La capa no es de tipo multipolygon' })
  @ApiResponse({ status: 404, description: 'Capa no encontrada' })
  async getFilteredFeatures(
    @Param('id', ParseIntPipe) id: number,
    @Query() queryParams: any,
    @GetUser() user?: any,
  ) {
    const userId = user?.userId;

    const { featureIds, ...filterParams } = queryParams;
    
    let featureIdsArray: number[] | undefined;
    if (featureIds !== undefined) {
      featureIdsArray = Array.isArray(featureIds) ? featureIds : [featureIds];
      featureIdsArray = featureIdsArray.map((id: any) => Number(id));
    }

    const filters: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(filterParams)) {
      if (typeof value === 'string' && value.includes(',')) {
        filters[key] = value.split(',').map(v => v.trim());
      } else {
        filters[key] = value as string;
      }
    }

    return this.layersService.getFilteredFeatures(
      id,
      Object.keys(filters).length > 0 ? filters : undefined,
      featureIdsArray,
      userId,
    );
  }

  @Get('features/filter-multiple')
  @ApiOperation({
    summary: 'Filtrar features de MÚLTIPLES capas con los mismos filtros',
    description: `
      **SOLO PARA CAPAS MULTIPOLYGON**
      
      Aplica los mismos filtros a múltiples capas y retorna todas las features que cumplan.
      Útil cuando tienes varias capas relacionadas (Distritos, Regiones, Sectores, etc.)
      y quieres filtrarlas todas con los mismos criterios.
      
      **Ejemplo de caso de uso:**
      Tienes 4 capas:
      - Distritos (con CODDISTRITO, CODREGION)
      - Regiones (con CODDISTRITO, CODREGION)
      - Limites-Sucursales (con CODDISTRITO, CODREGION)
      - Sectores-Promotor (con NO_DISTRIT, No_REGIÓN)
      
      Quieres ver TODAS las features de estas 4 capas donde CODDISTRITO=5:
      \`GET /layers/features/filter-multiple?layerIds=1,2,3,4&CODDISTRITO=5\`
      
      **Respuesta:**
      GeoJSON FeatureCollection con todas las features de todas las capas que cumplen los filtros,
      más metadata detallada por capa.
      
      **Ventajas:**
      - Una sola petición en lugar de 4
      - Aliases automáticos entre capas
      - Metadata detallada de cuántas features vienen de cada capa
    `,
  })
  @ApiQuery({
    name: 'layerIds',
    required: true,
    description: 'IDs de las capas a filtrar (separados por coma)',
    example: '1,2,3,4',
  })
  @ApiQuery({
    name: 'CODDISTRITO',
    required: false,
    description: 'Filtrar por código de distrito',
    example: '5',
  })
  @ApiQuery({
    name: 'CODREGION',
    required: false,
    description: 'Filtrar por código de región',
    example: '2',
  })
  @ApiResponse({
    status: 200,
    description: 'Features filtradas de múltiples capas obtenidas exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Alguna capa no es de tipo multipolygon' })
  @ApiResponse({ status: 404, description: 'No se encontraron capas con los IDs proporcionados' })
  async getFilteredFeaturesMultipleLayers(
    @Query() queryParams: any,
    @GetUser() user?: any,
  ) {
    const userId = user?.userId;

    // Extraer layerIds y construir objeto de filtros
    const { layerIds, ...filterParams } = queryParams;
    
    if (!layerIds) {
      throw new BadRequestException('El parámetro layerIds es requerido');
    }

    // Normalizar layerIds a array (soporta comas y múltiples params)
    let layerIdsArray: number[];
    if (typeof layerIds === 'string') {
      layerIdsArray = layerIds.split(',').map((id: string) => Number(id.trim()));
    } else if (Array.isArray(layerIds)) {
      layerIdsArray = layerIds.map((id: any) => Number(id));
    } else {
      layerIdsArray = [Number(layerIds)];
    }

    // Procesar filtros
    const filters: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(filterParams)) {
      if (typeof value === 'string' && value.includes(',')) {
        filters[key] = value.split(',').map(v => v.trim());
      } else {
        filters[key] = value as string;
      }
    }

    return this.layersService.getFilteredFeaturesMultipleLayers(
      layerIdsArray,
      Object.keys(filters).length > 0 ? filters : undefined,
      userId,
    );
  }

  @Get(':id/features')
  @ApiOperation({
    summary: 'Obtener geometrías de features seleccionadas de una capa multipolygon',
    description: `
      **SOLO PARA CAPAS MULTIPOLYGON**
      
      Retorna las geometrías completas en formato GeoJSON de:
      - Features específicas si se proporciona el parámetro featureIds
      - Todas las features si no se proporciona featureIds
      
      **Parámetros:**
      - featureIds: Array opcional de IDs de features a obtener (ej: ?featureIds=1&featureIds=5&featureIds=10)
      
      **Caso de uso:**
      Este endpoint se usa después de obtener el catálogo con GET /layers/:id/features/catalog
      para cargar SOLO las geometrías de las features que el usuario seleccionó.
      
      **Ejemplo de flujo completo:**
      1. GET /layers/123/features/catalog → Obtener listado con nombres y bboxes
      2. Usuario selecciona "Estado A", "Estado B", "Estado C" (IDs: 1, 5, 10)
      3. GET /layers/123/features?featureIds=1&featureIds=5&featureIds=10 → Cargar solo esas 3 geometrías
      4. Renderizar en mapa solo las features seleccionadas
      
      **Ventajas:**
      - No cargas todas las geometrías innecesariamente
      - Respuesta mucho más rápida y ligera
      - Mejor experiencia de usuario en capas grandes
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la capa multipolygon' })
  @ApiQuery({
    name: 'featureIds',
    required: false,
    type: [Number],
    description:
      'IDs de features específicas a obtener. Si no se proporciona, retorna todas las features.',
    example: [1, 5, 10],
  })
  @ApiResponse({
    status: 200,
    description: 'GeoJSON con las features seleccionadas',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'FeatureCollection' },
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'Feature' },
              id: { type: 'number' },
              geometry: { type: 'object' },
              properties: { type: 'object' },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            layerId: { type: 'number' },
            layerName: { type: 'string' },
            totalFeatures: { type: 'number' },
            selectedFeatureIds: {
              oneOf: [
                { type: 'array', items: { type: 'number' } },
                { type: 'string', example: 'all' },
              ],
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'La capa no es de tipo multipolygon' })
  @ApiResponse({ status: 404, description: 'Capa no encontrada' })
  async getSelectedFeatures(
    @Param('id', ParseIntPipe) id: number,
    @Query('featureIds') featureIds?: number | number[],
    @GetUser() user?: any,
  ) {
    const userId = user?.userId;

    // Normalizar featureIds a array
    let featureIdsArray: number[] | undefined;
    if (featureIds !== undefined) {
      featureIdsArray = Array.isArray(featureIds) ? featureIds : [featureIds];
      // Convertir a números
      featureIdsArray = featureIdsArray.map((id) => Number(id));
    }

    return this.layersService.getSelectedFeatures(id, featureIdsArray, userId);
  }

  @Get(':id/tiles/:z/:x/:y.mvt')
  @ApiOperation({
    summary: 'Get vector tile (MVT) - MEJOR para capas grandes',
    description: `
      Obtiene un tile vectorial en formato Mapbox Vector Tiles (MVT).
      
      **⚡ PERFECTO PARA CAPAS DE 100,000+ FEATURES:**
      - Solo carga geometrías visibles en ese tile
      - Simplificación automática según zoom
      - Formato binario ultra compacto
      - Compatible con Mapbox GL JS, Leaflet
      
      **Cómo funciona:**
      - El mapa divide el mundo en cuadrículas (tiles)
      - z = zoom level (0-22)
      - x, y = coordenadas del tile
      - Cada tile es ~5-50KB (vs MB con GeoJSON)
      
      **Ejemplo:**
      GET /layers/1/tiles/14/4521/7329.mvt
      (Tile de zoom 14 en Guatemala City)
    `,
  })
  @ApiParam({ name: 'id', description: 'Layer ID', type: 'number', example: 1 })
  @ApiParam({ name: 'z', description: 'Zoom level (0-22)', type: 'number', example: 14 })
  @ApiParam({ name: 'x', description: 'Tile X coordinate', type: 'number', example: 4521 })
  @ApiParam({ name: 'y', description: 'Tile Y coordinate', type: 'number', example: 7329 })
  @ApiResponse({
    status: 200,
    description: 'Binary MVT tile',
    content: { 'application/vnd.mapbox-vector-tile': {} },
  })
  async getLayerTile(
    @Param('id', ParseIntPipe) id: number,
    @Param('z', ParseIntPipe) z: number,
    @Param('x', ParseIntPipe) x: number,
    @Param('y', ParseIntPipe) y: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (z < 0 || z > 22) {
      throw new BadRequestException('Zoom level debe estar entre 0 y 22');
    }

    const tile = await this.layersService.getLayerTile(id, z, x, y);

    res.set({
      'Content-Type': 'application/vnd.mapbox-vector-tile',
      'Cache-Control': 'public, max-age=86400', // Cache 24h
      'Content-Encoding': 'gzip',
    });

    return new StreamableFile(tile);
  }

  @Get(':id/clusters')
  @ApiOperation({
    summary: 'Get clustered points - Para capas de puntos grandes',
    description: `
      Agrupa features cercanos en clusters para mejor rendimiento.
      
      **Ideal para:**
      - Capas de puntos con 10,000+ features
      - Visualización de densidad
      - Zoom out (vista general)
      
      **Respuesta:**
      - Puntos individuales si pocos en vista
      - Clusters con conteo si muchos cercanos
      - Propiedades: cluster=true, point_count=N
    `,
  })
  @ApiParam({ name: 'id', type: 'number', example: 1 })
  @ApiQuery({ name: 'minLon', required: true, type: Number })
  @ApiQuery({ name: 'minLat', required: true, type: Number })
  @ApiQuery({ name: 'maxLon', required: true, type: Number })
  @ApiQuery({ name: 'maxLat', required: true, type: Number })
  @ApiQuery({ name: 'zoom', required: true, type: Number, example: 10 })
  async getLayerClusters(
    @Param('id', ParseIntPipe) id: number,
    @Query('minLon') minLon: number,
    @Query('minLat') minLat: number,
    @Query('maxLon') maxLon: number,
    @Query('maxLat') maxLat: number,
    @Query('zoom') zoom: number,
  ) {
    const bounds = {
      minLon: parseFloat(minLon.toString()),
      minLat: parseFloat(minLat.toString()),
      maxLon: parseFloat(maxLon.toString()),
      maxLat: parseFloat(maxLat.toString()),
    };

    const zoomLevel = parseInt(zoom.toString());

    return this.layersService.getLayerClusters(id, bounds, zoomLevel);
  }

  @Post(':id/geojson/intersects')
  @ApiOperation({
    summary: 'Obtener features que se intersectan con una geometría',
    description: `
      Retorna solo las features de una capa que se intersectan con una geometría proporcionada.
      
      **Casos de uso:**
      - Obtener puntos dentro de un polígono
      - Obtener líneas que cruzan un área
      - Filtrar features por región geográfica personalizada
      - Análisis espacial: "¿qué puntos de interés están dentro de este distrito?"
      
      **Ventajas:**
      - Análisis espacial preciso con ST_Intersects de PostGIS
      - Soporta cualquier tipo de geometría (Point, LineString, Polygon, MultiPolygon, etc.)
      - Límite configurable de features
      - Simplificación opcional de geometrías
      
      **Ejemplo de body:**
      \`\`\`json
      {
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [-90.5, 14.5],
            [-90.5, 14.7],
            [-90.3, 14.7],
            [-90.3, 14.5],
            [-90.5, 14.5]
          ]]
        }
      }
      \`\`\`
      
      **Flujo recomendado:**
      1. Usuario selecciona un polígono de una capa (ej: un distrito)
      2. Obtener la geometría de ese polígono con GET /layers/:id/features?featureIds=X
      3. Usar esa geometría aquí para filtrar otra capa (ej: puntos de venta)
      4. Resultado: solo los puntos que están dentro del distrito seleccionado
    `,
  })
  @ApiParam({ name: 'id', description: 'ID de la capa a filtrar', type: 'number', example: 1 })
  @ApiQuery({
    name: 'maxFeatures',
    required: false,
    type: Number,
    description: 'Límite máximo de features a retornar',
    example: 5000,
  })
  @ApiQuery({
    name: 'simplify',
    required: false,
    type: Boolean,
    description: 'Simplificar geometrías para reducir tamaño',
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Features que intersectan con la geometría',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'FeatureCollection' },
        features: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'Feature' },
              geometry: { type: 'object' },
              properties: { type: 'object' },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            layerId: { type: 'number' },
            layerName: { type: 'string' },
            totalIntersecting: { type: 'number', example: 234 },
            returned: { type: 'number', example: 234 },
            limited: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Geometría inválida' })
  @ApiResponse({ status: 404, description: 'Capa no encontrada' })
  async getLayerFeaturesIntersecting(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { geometry: any },
    @Query('maxFeatures') maxFeatures?: number,
    @Query('simplify') simplify?: boolean,
    @GetUser() user?: any,
  ) {
    if (!body.geometry) {
      throw new BadRequestException('El campo "geometry" es requerido en el body');
    }

    const userId = user?.userId;
    const limit = maxFeatures ? parseInt(maxFeatures.toString()) : 5000;
    const shouldSimplify = simplify !== undefined ? simplify : false;

    return this.layersService.getLayerFeaturesIntersecting(
      id,
      body.geometry,
      limit,
      shouldSimplify,
      userId,
    );
  }

  @Get(':id/geojson/bbox')
  @ApiOperation({
    summary: 'Get features in viewport (bbox)',
    description: `
      Get only features that intersect with a bounding box.
    
      - Límite de 5000 features por defecto
      - Simplificación opcional de geometrías
      - Mensaje si hay más features disponibles
      - Metadata sobre features totales vs retornados
      
      **Perfect for:**
      - Loading only visible features in map viewport
      - Optimizing large layers
      - Progressive loading as user pans/zooms
      
      **Performance:**
      - Very fast (uses spatial index)
      - Only returns features in viewport
      - Reduces data transfer
      
      **Parámetros opcionales:**
      - maxFeatures: Límite de features (default 5000)
      - simplify: Simplificar geometrías (default true)
      
      **Example:**
      Guatemala City viewport:
      minLon=-90.55, minLat=14.55, maxLon=-90.45, maxLat=14.65
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Layer ID',
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'minLon',
    required: true,
    type: Number,
    description: 'Minimum longitude (west)',
    example: -90.55,
  })
  @ApiQuery({
    name: 'minLat',
    required: true,
    type: Number,
    description: 'Minimum latitude (south)',
    example: 14.55,
  })
  @ApiQuery({
    name: 'maxLon',
    required: true,
    type: Number,
    description: 'Maximum longitude (east)',
    example: -90.45,
  })
  @ApiQuery({
    name: 'maxLat',
    required: true,
    type: Number,
    description: 'Maximum latitude (north)',
    example: 14.65,
  })
  @ApiQuery({
    name: 'maxFeatures',
    required: false,
    type: Number,
    description: 'Límite máximo de features',
    example: 5000,
  })
  @ApiQuery({
    name: 'simplify',
    required: false,
    type: Boolean,
    description: 'Simplificar geometrías',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'GeoJSON with features in bbox',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'FeatureCollection' },
        features: { type: 'array' },
        metadata: {
          type: 'object',
          properties: {
            totalInBounds: { type: 'number', example: 8543 },
            returned: { type: 'number', example: 5000 },
            limited: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Mostrando 5000 de 8543 features. Haz zoom para ver más detalles.' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid bounding box parameters',
  })
  @ApiResponse({ status: 404, description: 'Layer not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getLayerFeaturesInBBox(
    @Param('id', ParseIntPipe) id: number,
    @Query('minLon') minLon: number,
    @Query('minLat') minLat: number,
    @Query('maxLon') maxLon: number,
    @Query('maxLat') maxLat: number,
    @Query('maxFeatures') maxFeatures?: number,
    @Query('simplify') simplify?: boolean,
  ) {
    // ? Validar parámetros
    if (
      minLon === undefined ||
      minLat === undefined ||
      maxLon === undefined ||
      maxLat === undefined
    ) {
      throw new BadRequestException(
        'All bbox parameters are required: minLon, minLat, maxLon, maxLat',
      );
    }

    // Validar que los valores sean números válidos
    const bounds = {
      minLon: parseFloat(minLon.toString()),
      minLat: parseFloat(minLat.toString()),
      maxLon: parseFloat(maxLon.toString()),
      maxLat: parseFloat(maxLat.toString()),
    };

    if (
      isNaN(bounds.minLon) ||
      isNaN(bounds.minLat) ||
      isNaN(bounds.maxLon) ||
      isNaN(bounds.maxLat)
    ) {
      throw new BadRequestException(
        'All bbox parameters must be valid numbers',
      );
    }

    // ? Validar rangos
    if (bounds.minLon < -180 || bounds.minLon > 180) {
      throw new BadRequestException('minLon must be between -180 and 180');
    }
    if (bounds.maxLon < -180 || bounds.maxLon > 180) {
      throw new BadRequestException('maxLon must be between -180 and 180');
    }
    if (bounds.minLat < -90 || bounds.minLat > 90) {
      throw new BadRequestException('minLat must be between -90 and 90');
    }
    if (bounds.maxLat < -90 || bounds.maxLat > 90) {
      throw new BadRequestException('maxLat must be between -90 and 90');
    }

    // ? Validar que min < max
    if (bounds.minLon >= bounds.maxLon) {
      throw new BadRequestException('minLon must be less than maxLon');
    }
    if (bounds.minLat >= bounds.maxLat) {
      throw new BadRequestException('minLat must be less than maxLat');
    }

    const limit = maxFeatures ? parseInt(maxFeatures.toString()) : 5000;
    const shouldSimplify = simplify !== undefined ? simplify : true;

    return this.layersService.getLayerFeaturesInBBox(id, bounds, limit, shouldSimplify);
  }

  @Get('user/stats')
  async getUserLayerStats(
    @GetUser() user?: any,
  ) {
    // const userId = user.userId;
    return this.layersService.getUserLayerStats();
  }


  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar capa',
    description: `
      Actualiza la metadata de la capa (nombre, descripción, estilo, visibilidad).
      
      **Campos editables:**
      - name: Nombre de la capa (3-200 caracteres)
      - description: Descripción de la capa
      - isPublic: Control de visibilidad pública
      - style: Configuración de estilo (objeto JSON)
      
      **Nota:**
      - No se pueden actualizar datos de geometría (features son inmutables)
      - Solo el propietario puede actualizar
      - La capa debe estar activa
      
      **Casos de uso:**
      - Renombrar capa
      - Actualizar estilo para visualización
      - Cambiar configuración de privacidad
      - Agregar/actualizar descripción
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Layer ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Layer updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Updated Layer Name' },
        description: { type: 'string' },
        isPublic: { type: 'boolean' },
        style: { type: 'object' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Layer not found' })
  @ApiResponse({ status: 403, description: 'Not the layer owner' })
  async updateLayer(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLayerDto: UpdateLayerDto,
    @GetUser() user?: any,
  ) {
    console.log({user})
    const userId = user.userId;
    return this.layersService.updateLayer(id, userId, updateLayerDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar capa (soft delete)',
    description: `
      Eliminación lógica de una capa (establece isActive = false).
      
      **Restricciones:**
      - Solo el propietario puede eliminar
      - La capa debe estar activa
      - Eliminación lógica (datos retenidos, no visibles)
      
      **Efectos:**
      - La capa se vuelve inactiva
      - Removida de la lista de capas del usuario
      - Ya no accesible vía API
      - Datos preservados en la base de datos
      
      **Casos de uso:**
      - Remover capas no deseadas
      - Limpiar datos de prueba
      - Archivar capas antiguas
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'Layer ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Layer deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Layer deleted successfully' },
        id: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Layer not found' })
  @ApiResponse({ status: 403, description: 'Not the layer owner' })
  async deleteLayer(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user?: any,
  ) {
    const userId = user.userId;
    return this.layersService.deleteLayer(id, userId);
  }
}
