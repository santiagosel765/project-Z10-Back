# Maps & Layers Integration - Guía de Uso

## 📋 Resumen

El sistema ahora soporta la asociación automática de capas (layers) con mapas al momento de crearlas, utilizando transacciones para garantizar la integridad de los datos.

## 🔄 Flujo de Creación de Layer con Map

### 1. Crear un Mapa

```bash
POST /maps?userId=1
Content-Type: application/json

{
  "name": "Mapa de Operaciones - Zona 10",
  "description": "Mapa principal para operaciones",
  "webmapItemId": "abc123xyz",
  "mapType": "operations",
  "isDefault": true,
  "settings": {
    "basemap": "streets",
    "zoom": 12,
    "center": [-90.5069, 14.6349]
  }
}
```

**Respuesta:**

```json
{
  "id": 1,
  "name": "Mapa de Operaciones - Zona 10",
  "webmapItemId": "abc123xyz",
  "mapType": "operations",
  "isDefault": true,
  "settings": { ... },
  "createdAt": "2025-11-24T..."
}
```

### 2. Crear Layer y Asociarla Automáticamente al Mapa

```bash
POST /layers/upload
Content-Type: multipart/form-data

file: [archivo.geojson]
name: "Puntos de Interés"
description: "Lugares importantes en Zona 10"
isPublic: false
mapId: 1           # ← ID del mapa creado anteriormente
displayOrder: 0    # ← Orden de visualización (opcional)
userId: 1
```

**Respuesta:**

```json
{
  "id": 5,
  "name": "Puntos de Interés",
  "description": "Lugares importantes en Zona 10",
  "layerType": "point",
  "totalFeatures": 150,
  "centroid": { ... },
  "bbox": { ... },
  "geometryTypes": ["Point"],
  "properties": [...],
  "summary": "Layer contains 150 Point features...",
  "createdAt": "2025-11-24T...",
  "mapId": 1        # ← Confirmación de asociación
}
```

## 🔍 ¿Qué Sucede Internamente?

Cuando se proporciona `mapId` en la creación de un layer:

1. **Validación de Mapa**: Verifica que el mapa existe y está activo
2. **Creación de Layer**: Inserta el layer con todos sus features
3. **Creación de MapLayer**: Asocia automáticamente el layer al mapa
4. **Commit de Transacción**: Todo se guarda en una sola transacción atómica

```typescript
// LayersService.createLayerFromGeoJson()
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.startTransaction();

try {
  // 1. Guardar layer
  const savedLayer = await queryRunner.manager.save(layer);

  // 2. Insertar features
  await this.insertFeaturesWithGeometry(...);

  // 3. Actualizar bbox
  await this.updateLayerBBox(...);

  // 4. Si hay mapId, crear MapLayer
  if (dto.mapId) {
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
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
}
```

## 🎯 Casos de Uso

### Caso 1: Layer sin Mapa (para uso posterior)

```json
{
  "name": "Capa Base Regional",
  "description": "Capa que se usará en múltiples mapas",
  "isPublic": true
  // Sin mapId - se puede asociar después
}
```

### Caso 2: Layer Directamente en Mapa

```json
{
  "name": "Incidentes Recientes",
  "description": "Últimos incidentes reportados",
  "mapId": 1,
  "displayOrder": 1, // Arriba de otras capas
  "isPublic": false
}
```

### Caso 3: Agregar Layer Existente a Otro Mapa

```bash
POST /map-layers
Content-Type: application/json

{
  "mapId": 2,
  "layerId": 5,  # Layer ya existente
  "displayOrder": 0,
  "isVisible": true,
  "opacity": 0.8,
  "createdBy": 1
}
```

## 📊 Consultar Mapa con sus Capas

```bash
GET /maps/1?includeLayers=true
```

**Respuesta:**

```json
{
  "id": 1,
  "name": "Mapa de Operaciones",
  "webmapItemId": "abc123xyz",
  "mapType": "operations",
  "isDefault": true,
  "settings": { ... },
  "mapLayers": [
    {
      "mapId": 1,
      "layerId": 5,
      "displayOrder": 0,
      "isVisible": true,
      "opacity": 1.0,
      "layer": {
        "id": 5,
        "name": "Puntos de Interés",
        "layerType": "point",
        "totalFeatures": 150,
        ...
      }
    }
  ]
}
```

## 🔄 Flujo Completo de Ejemplo

```bash
# 1. Crear el mapa
curl -X POST http://localhost:3000/maps?userId=1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mapa Principal",
    "webmapItemId": "xyz789",
    "mapType": "general",
    "isDefault": true
  }'

# Respuesta: { "id": 1, ... }

# 2. Subir layer asociada al mapa
curl -X POST http://localhost:3000/layers/upload \
  -F "file=@puntos.geojson" \
  -F "name=Ubicaciones Importantes" \
  -F "mapId=1" \
  -F "displayOrder=0" \
  -F "userId=1"

# Respuesta: { "id": 5, ..., "mapId": 1 }

# 3. Consultar el mapa con sus capas
curl http://localhost:3000/maps/1?includeLayers=true
```

## ⚠️ Validaciones y Errores

### Error: Mapa no existe

```json
{
  "statusCode": 404,
  "message": "Map with ID 99 not found",
  "error": "Not Found"
}
```

### Error: Rollback de transacción

Si algo falla durante la creación (layer o map-layer), toda la transacción se revierte:

- El layer NO se crea
- La relación map-layer NO se crea
- Los features NO se insertan

## 🚀 Beneficios de este Enfoque

1. **Atomicidad**: Todo se crea o nada se crea (transacciones)
2. **Simplicidad**: Un solo endpoint para crear layer + asociación
3. **Flexibilidad**: Opcionalmente se puede omitir `mapId`
4. **Consistencia**: Validaciones automáticas
5. **Performance**: Una sola transacción vs múltiples llamadas

## 📝 Notas Importantes

- En producción debe obtenerse del token JWT
- El `displayOrder` por defecto es 0
- La `opacity` inicial es 1.0 (totalmente visible)
- La `isVisible` inicial es true
