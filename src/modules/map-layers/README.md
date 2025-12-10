# MapLayer Module

Módulo para gestionar la relación muchos-a-muchos entre **Maps** y **Layers**.

## 📋 Descripción

El módulo `MapLayer` permite asociar múltiples capas (layers) a un mapa (map), configurando aspectos como:
- Orden de visualización
- Visibilidad
- Opacidad
- Configuración adicional personalizada

## 🗂️ Estructura de la Tabla

```sql
CREATE TABLE map_layer (
  map_id INTEGER NOT NULL,
  layer_id INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  opacity NUMERIC(3,2) DEFAULT 1.0,
  layerConfig JSONB,
  created_at TIMESTAMP DEFAULT now(),
  created_by INTEGER,
  
  PRIMARY KEY (map_id, layer_id),
  FOREIGN KEY (map_id) REFERENCES map(id) ON DELETE CASCADE,
  FOREIGN KEY (layer_id) REFERENCES layer(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES user(id),
  
  CONSTRAINT valid_opacity CHECK (opacity >= 0 AND opacity <= 1),
  CONSTRAINT valid_display_order CHECK (display_order >= 0)
);
```

## 🔗 Endpoints

### 1. Agregar capa a un mapa
```http
POST /map-layers
Content-Type: application/json

{
  "mapId": 1,
  "layerId": 5,
  "displayOrder": 0,
  "isVisible": true,
  "opacity": 1.0,
  "layerConfig": {
    "minZoom": 5,
    "maxZoom": 18,
    "interactive": true
  },
  "createdBy": 1
}
```

### 2. Obtener todas las capas de un mapa
```http
GET /map-layers/map/:mapId
```

Respuesta:
```json
[
  {
    "mapId": 1,
    "layerId": 5,
    "displayOrder": 0,
    "isVisible": true,
    "opacity": 1.0,
    "layerConfig": { ... },
    "layer": {
      "id": 5,
      "name": "Puntos de Interés",
      "layerType": "point",
      ...
    }
  }
]
```

### 3. Obtener todos los mapas que contienen una capa
```http
GET /map-layers/layer/:layerId
```

### 4. Actualizar configuración de capa en un mapa
```http
PATCH /map-layers/:mapId/:layerId
Content-Type: application/json

{
  "displayOrder": 1,
  "isVisible": false,
  "opacity": 0.7
}
```

### 5. Eliminar capa de un mapa
```http
DELETE /map-layers/:mapId/:layerId
```

### 6. Reordenar capas en un mapa
```http
PATCH /map-layers/map/:mapId/reorder
Content-Type: application/json

{
  "layers": [
    { "layerId": 5, "displayOrder": 0 },
    { "layerId": 8, "displayOrder": 1 },
    { "layerId": 3, "displayOrder": 2 }
  ]
}
```

## 💡 Casos de Uso

### Ejemplo 1: Agregar múltiples capas a un mapa
```typescript
// Agregar capa base
await mapLayersService.addLayerToMap({
  mapId: 1,
  layerId: 10,
  displayOrder: 0,
  isVisible: true,
  opacity: 1.0,
  createdBy: userId
});

// Agregar capa de puntos de interés
await mapLayersService.addLayerToMap({
  mapId: 1,
  layerId: 15,
  displayOrder: 1,
  isVisible: true,
  opacity: 0.8,
  layerConfig: {
    clustering: true,
    clusterRadius: 50
  },
  createdBy: userId
});
```

### Ejemplo 2: Cambiar visibilidad de capas
```typescript
await mapLayersService.updateMapLayer(1, 15, {
  isVisible: false
});
```

### Ejemplo 3: Reordenar capas
```typescript
await mapLayersService.reorderLayers(1, [
  { layerId: 15, displayOrder: 0 }, // Puntos ahora arriba
  { layerId: 10, displayOrder: 1 }  // Base ahora abajo
]);
```

## 🔍 Índices

- `idx_map_layer_map_id`: Búsqueda por mapa
- `idx_map_layer_layer_id`: Búsqueda por capa
- `idx_map_layer_is_visible`: Filtrado por visibilidad
- `idx_map_layer_display_order`: Ordenamiento de capas
- `idx_map_layer_created_at`: Ordenamiento temporal

## ✅ Validaciones

- **opacity**: Debe estar entre 0.0 y 1.0
- **displayOrder**: Debe ser >= 0
- **Unicidad**: Una capa solo puede estar asociada una vez a un mapa
- **Existencia**: Map y Layer deben existir antes de crear la relación

## 🔐 Consideraciones de Seguridad

- Validar que el usuario tenga permisos sobre el mapa antes de modificarlo
- Validar que el usuario tenga acceso a la capa (pública o compartida)
- Implementar rate limiting en endpoints de modificación

## 📊 Relaciones

```
Map (1) ----< MapLayer >---- (N) Layer
             ^
             |
           User (created_by)
```

## 🚀 Próximos Pasos

- [ ] Agregar endpoints de bulk operations
- [ ] Implementar caché para consultas frecuentes
- [ ] Agregar validación de permisos
- [ ] Agregar eventos de WebSocket para cambios en tiempo real
- [ ] Implementar versionado de configuraciones
