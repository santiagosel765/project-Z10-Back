# 🚀 Guía de Optimización para Capas Grandes

## Problema Actual
Con **108,000 features**, las capas son demasiado grandes para cargar todas las geometrías de una vez.

## ✅ Soluciones Implementadas

### 1. **Vector Tiles (MVT)** - ⭐ MEJOR OPCIÓN

#### Backend
```typescript
GET /layers/:id/tiles/:z/:x/:y.mvt
```

#### Frontend (Mapbox GL JS)
```javascript
map.addSource('mi-capa-grande', {
  type: 'vector',
  tiles: [
    'http://localhost:3000/api/layers/1/tiles/{z}/{x}/{y}.mvt'
  ],
  minzoom: 0,
  maxzoom: 22
});

map.addLayer({
  id: 'mi-capa-grande-layer',
  type: 'fill', // o 'line', 'circle', etc
  source: 'mi-capa-grande',
  'source-layer': 'layer', // nombre del layer en el MVT
  paint: {
    'fill-color': '#3388ff',
    'fill-opacity': 0.5
  }
});
```

#### Frontend (Leaflet con plugin)
```javascript
// npm install leaflet-vector-tile-layer
import 'leaflet-vector-tile-layer';

L.vectorTileLayer('http://localhost:3000/api/layers/1/tiles/{z}/{x}/{y}.mvt', {
  vectorTileLayerStyles: {
    layer: {
      color: '#3388ff',
      fillOpacity: 0.5
    }
  }
}).addTo(map);
```

**Ventajas:**
- ✅ Solo carga tiles visibles
- ✅ Simplificación automática por zoom
- ✅ ~5-50KB por tile vs MB con GeoJSON completo
- ✅ Cache en servidor (24h)
- ✅ Performance excelente hasta millones de features

---

### 2. **Clustering para Puntos**

#### Backend
```typescript
GET /layers/:id/clusters?minLon=-90.55&minLat=14.55&maxLon=-90.45&maxLat=14.65&zoom=10
```

#### Frontend (Leaflet)
```javascript
// npm install leaflet.markercluster
import 'leaflet.markercluster';

async function loadClusters(bounds, zoom) {
  const params = new URLSearchParams({
    minLon: bounds.getWest(),
    minLat: bounds.getSouth(),
    maxLon: bounds.getEast(),
    maxLat: bounds.getNorth(),
    zoom: zoom
  });
  
  const response = await fetch(`/api/layers/1/clusters?${params}`);
  const geojson = await response.json();
  
  // Crear cluster layer
  const markers = L.markerClusterGroup({
    maxClusterRadius: 50,
    disableClusteringAtZoom: 16
  });
  
  geojson.features.forEach(feature => {
    if (feature.properties.cluster) {
      // Es un cluster
      const marker = L.marker(feature.geometry.coordinates.reverse(), {
        icon: L.divIcon({
          html: `<div class="cluster-icon">${feature.properties.point_count}</div>`,
          className: 'custom-cluster-icon'
        })
      });
      markers.addLayer(marker);
    } else {
      // Es un punto individual
      const marker = L.marker(feature.geometry.coordinates.reverse());
      markers.addLayer(marker);
    }
  });
  
  map.addLayer(markers);
}
```

**Ventajas:**
- ✅ Agrupa puntos cercanos
- ✅ Menos markers = mejor performance
- ✅ Visualización de densidad
- ✅ Ideal para zoom out

---

### 3. **BBox con Límite** (Mejorado)

#### Backend
```typescript
GET /layers/:id/geojson/bbox?minLon=-90.55&minLat=14.55&maxLon=-90.45&maxLat=14.65&maxFeatures=5000&simplify=true
```

#### Respuesta
```json
{
  "type": "FeatureCollection",
  "features": [...],
  "metadata": {
    "totalInBounds": 8543,
    "returned": 5000,
    "limited": true,
    "message": "Mostrando 5000 de 8543 features. Haz zoom para ver más detalles."
  }
}
```

#### Frontend
```javascript
async function loadVisibleFeatures(bounds) {
  const params = new URLSearchParams({
    minLon: bounds.getWest(),
    minLat: bounds.getSouth(),
    maxLon: bounds.getEast(),
    maxLat: bounds.getNorth(),
    maxFeatures: 5000,
    simplify: true
  });
  
  const response = await fetch(`/api/layers/1/geojson/bbox?${params}`);
  const data = await response.json();
  
  // Mostrar mensaje si está limitado
  if (data.metadata.limited) {
    console.warn(data.metadata.message);
    // Mostrar toast/notificación al usuario
  }
  
  L.geoJSON(data).addTo(map);
}

// Actualizar cuando el usuario mueve el mapa
map.on('moveend', () => {
  loadVisibleFeatures(map.getBounds());
});
```

**Ventajas:**
- ✅ Solo carga features visibles
- ✅ Límite configurable
- ✅ Simplificación de geometrías
- ✅ Metadata sobre limitación

---

### 4. **Optimización de Guardado**

#### Mejoras implementadas:

**Para capas pequeñas (<10k features):**
- Batch size: 500
- Índices activos durante inserción

**Para capas grandes (>10k features):**
- Batch size: 1000
- Índices deshabilitados durante inserción
- Reconstrucción de índices al final
- Comando `ANALYZE` para actualizar estadísticas
- Logging de progreso cada 5000 features

#### Tiempos estimados:
- **10,000 features**: ~30 segundos
- **50,000 features**: ~2 minutos
- **100,000 features**: ~4-5 minutos
- **150,000 features**: ~7 minutos

---

## 📊 Comparación de Métodos

| Método | Features soportados | Tamaño respuesta | Velocidad | Uso recomendado |
|--------|-------------------|------------------|-----------|------------------|
| **Vector Tiles (MVT)** | Ilimitado | 5-50KB/tile | ⚡⚡⚡⚡⚡ | **Cualquier capa grande** |
| **Clustering** | 100k+ puntos | 50-200KB | ⚡⚡⚡⚡ | Capas de puntos |
| **BBox limitado** | 50k | 500KB-2MB | ⚡⚡⚡ | Capas medianas |
| **GeoJSON completo** | <5k | 1-10MB | ⚡⚡ | Capas pequeñas |

---

## 🎯 Recomendaciones por Tamaño de Capa

### < 5,000 features
✅ Usar endpoint completo: `GET /layers/:id/geojson`

### 5,000 - 20,000 features
✅ Usar bbox con límite: `GET /layers/:id/geojson/bbox?maxFeatures=5000`

### 20,000 - 100,000 features
✅ **Usar Vector Tiles**: `GET /layers/:id/tiles/{z}/{x}/{y}.mvt`
✅ O clustering para puntos: `GET /layers/:id/clusters`

### > 100,000 features
✅ **SOLO Vector Tiles**: `GET /layers/:id/tiles/{z}/{x}/{y}.mvt`

---

## 🔧 Configuración Adicional

### Aumentar límites de memoria (si es necesario)
```typescript
// src/main.ts
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
```

### Aumentar timeout para uploads grandes
```typescript
// src/main.ts
app.setTimeout(600000); // 10 minutos
```

### PostgreSQL: Aumentar work_mem para queries complejas
```sql
-- postgresql.conf
work_mem = '256MB'
maintenance_work_mem = '512MB'
```

---

## 🎨 Ejemplo Completo (Frontend)

```javascript
class LayerManager {
  constructor(map) {
    this.map = map;
    this.currentLayerId = null;
    this.layerType = null; // 'mvt', 'cluster', 'geojson'
  }
  
  async loadLayer(layerId, totalFeatures) {
    // Seleccionar método automáticamente
    if (totalFeatures > 20000) {
      return this.loadAsMVT(layerId);
    } else if (totalFeatures > 5000) {
      return this.loadAsClusters(layerId);
    } else {
      return this.loadAsGeoJSON(layerId);
    }
  }
  
  loadAsMVT(layerId) {
    this.layerType = 'mvt';
    
    this.map.addSource(`layer-${layerId}`, {
      type: 'vector',
      tiles: [`/api/layers/${layerId}/tiles/{z}/{x}/{y}.mvt`],
      minzoom: 0,
      maxzoom: 22
    });
    
    this.map.addLayer({
      id: `layer-${layerId}`,
      type: 'fill',
      source: `layer-${layerId}`,
      'source-layer': 'layer',
      paint: {
        'fill-color': '#3388ff',
        'fill-opacity': 0.5,
        'fill-outline-color': '#0066cc'
      }
    });
  }
  
  async loadAsClusters(layerId) {
    this.layerType = 'cluster';
    
    const updateClusters = async () => {
      const bounds = this.map.getBounds();
      const zoom = this.map.getZoom();
      
      const params = new URLSearchParams({
        minLon: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLon: bounds.getEast(),
        maxLat: bounds.getNorth(),
        zoom: Math.floor(zoom)
      });
      
      const response = await fetch(`/api/layers/${layerId}/clusters?${params}`);
      const geojson = await response.json();
      
      // Actualizar source
      if (this.map.getSource(`layer-${layerId}`)) {
        this.map.getSource(`layer-${layerId}`).setData(geojson);
      } else {
        this.map.addSource(`layer-${layerId}`, {
          type: 'geojson',
          data: geojson
        });
        
        this.map.addLayer({
          id: `layer-${layerId}`,
          type: 'circle',
          source: `layer-${layerId}`,
          paint: {
            'circle-radius': [
              'case',
              ['get', 'cluster'], 
              ['interpolate', ['linear'], ['get', 'point_count'], 10, 20, 100, 30, 1000, 40],
              8
            ],
            'circle-color': [
              'case',
              ['get', 'cluster'],
              '#f28cb1',
              '#3388ff'
            ]
          }
        });
      }
    };
    
    this.map.on('moveend', updateClusters);
    await updateClusters();
  }
  
  async loadAsGeoJSON(layerId) {
    this.layerType = 'geojson';
    
    const response = await fetch(`/api/layers/${layerId}/geojson`);
    const geojson = await response.json();
    
    this.map.addSource(`layer-${layerId}`, {
      type: 'geojson',
      data: geojson
    });
    
    this.map.addLayer({
      id: `layer-${layerId}`,
      type: 'fill',
      source: `layer-${layerId}`,
      paint: {
        'fill-color': '#3388ff',
        'fill-opacity': 0.5
      }
    });
  }
}

// Uso
const layerManager = new LayerManager(map);
await layerManager.loadLayer(1, 108000); // Usará MVT automáticamente
```

---

## 📈 Monitoreo de Performance

```typescript
// En el frontend
console.time('Layer Load');
await loadLayer(layerId);
console.timeEnd('Layer Load');

// Medir memoria
console.log('Memory:', performance.memory?.usedJSHeapSize / 1024 / 1024, 'MB');
```

---

## 🐛 Troubleshooting

### Error: "Too many features"
➡️ Usar Vector Tiles o aumentar límite en backend

### Error: "Request timeout"
➡️ Aumentar timeout del servidor y cargar por tiles

### Mapa lento al hacer zoom
➡️ Implementar debouncing en eventos de mapa

```javascript
let timeout;
map.on('moveend', () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => loadVisibleFeatures(), 300);
});
```

### PostGIS query lenta
➡️ Verificar índices espaciales:
```sql
SELECT * FROM pg_indexes WHERE tablename = 'layer_feature';
```

---

## 📚 Recursos

- [Mapbox Vector Tiles Spec](https://docs.mapbox.com/vector-tiles/specification/)
- [Mapbox GL JS Docs](https://docs.mapbox.com/mapbox-gl-js/)
- [Leaflet Vector Tiles Plugin](https://github.com/Leaflet/Leaflet.VectorGrid)
- [PostGIS ST_AsMVT Docs](https://postgis.net/docs/ST_AsMVT.html)
