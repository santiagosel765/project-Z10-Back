# Guía: Endpoint de Intersección Espacial

## 📍 Endpoint: `POST /api/v1/layers/:id/geojson/intersects`

### Descripción

Este endpoint permite obtener **solo las features de una capa que se intersectan con una geometría específica**. Es ideal para análisis espacial como "encontrar todos los puntos dentro de un polígono".

---

## 🎯 Casos de Uso Comunes

### 1. **Puntos dentro de un polígono**
**Escenario:** Tienes una capa de puntos de venta y quieres ver solo los que están dentro de un distrito específico.

**Flujo:**
1. Usuario selecciona un distrito del mapa
2. Obtienes la geometría de ese distrito
3. Consultas la capa de puntos de venta con esa geometría
4. El mapa muestra solo los puntos dentro del distrito

### 2. **Líneas que cruzan un área**
**Escenario:** Tienes rutas de distribución y quieres ver cuáles pasan por una región específica.

### 3. **Polígonos que tocan/solapan otra área**
**Escenario:** Tienes sectores de promotores y quieres ver cuáles se solapan con un distrito administrativo.

---

## 🔧 Parámetros

### URL Parameters
- **`:id`** (required): ID de la capa que quieres filtrar

### Query Parameters
- **`maxFeatures`** (optional): Límite de features a retornar (default: 5000)
- **`simplify`** (optional): Simplificar geometrías (default: false)

### Body (JSON)
```json
{
  "geometry": {
    "type": "Polygon | MultiPolygon | Point | LineString | etc.",
    "coordinates": [ /* coordenadas GeoJSON */ ]
  }
}
```

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Puntos dentro de un Polígono Simple

**Request:**
```http
POST /api/v1/layers/16/geojson/intersects
Content-Type: application/json

{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [-90.5089, 14.5965],
      [-90.5089, 14.6965],
      [-90.4089, 14.6965],
      [-90.4089, 14.5965],
      [-90.5089, 14.5965]
    ]]
  }
}
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-90.45, 14.62]
      },
      "properties": {
        "name": "Punto de Venta 1",
        "sucursal": "Guatemala Central"
      }
    }
  ],
  "metadata": {
    "layerId": 16,
    "layerName": "Puntos de Venta",
    "totalIntersecting": 234,
    "returned": 234,
    "limited": false
  }
}
```

### Ejemplo 2: Usando la Geometría de Otra Feature

**Paso 1:** Obtener la geometría del distrito seleccionado
```javascript
// 1. Usuario selecciona un distrito en el mapa
const districtLayerId = 32;
const selectedDistrictId = 15; // ID del feature seleccionado

// 2. Obtener la geometría del distrito
const districtResponse = await axios.get(
  `/api/v1/layers/${districtLayerId}/features?featureIds=${selectedDistrictId}`
);

const districtGeometry = districtResponse.data.features[0].geometry;
```

**Paso 2:** Buscar puntos dentro de ese distrito
```javascript
// 3. Usar esa geometría para filtrar puntos de venta
const pointsLayerId = 16;

const pointsResponse = await axios.post(
  `/api/v1/layers/${pointsLayerId}/geojson/intersects`,
  {
    geometry: districtGeometry
  }
);

// 4. Renderizar solo los puntos que están dentro del distrito
const pointsInDistrict = pointsResponse.data.features;
console.log(`Encontrados ${pointsInDistrict.length} puntos en el distrito`);
```

---

## 💻 Código de Ejemplo: React + Axios

### Hook Personalizado para Intersección Espacial

```typescript
import { useState } from 'react';
import axios from 'axios';

interface IntersectParams {
  layerId: number;
  geometry: any; // GeoJSON Geometry
  maxFeatures?: number;
  simplify?: boolean;
}

interface IntersectResult {
  type: 'FeatureCollection';
  features: any[];
  metadata: {
    layerId: number;
    layerName: string;
    totalIntersecting: number;
    returned: number;
    limited: boolean;
    message?: string;
  };
}

export const useLayerIntersect = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getIntersectingFeatures = async ({
    layerId,
    geometry,
    maxFeatures = 5000,
    simplify = false,
  }: IntersectParams): Promise<IntersectResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<IntersectResult>(
        `/api/v1/layers/${layerId}/geojson/intersects`,
        { geometry },
        {
          params: { maxFeatures, simplify },
        }
      );

      setLoading(false);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al obtener features';
      setError(errorMessage);
      setLoading(false);
      return null;
    }
  };

  return { getIntersectingFeatures, loading, error };
};
```

### Componente de Ejemplo

```typescript
import React, { useState } from 'react';
import { useLayerIntersect } from './hooks/useLayerIntersect';

export const SpatialAnalysisComponent: React.FC = () => {
  const { getIntersectingFeatures, loading, error } = useLayerIntersect();
  const [results, setResults] = useState<any[]>([]);

  const handleDistrictClick = async (districtFeature: any) => {
    // Cuando el usuario hace clic en un distrito del mapa
    const pointsLayerId = 16; // ID de la capa de puntos de venta

    const result = await getIntersectingFeatures({
      layerId: pointsLayerId,
      geometry: districtFeature.geometry,
      maxFeatures: 1000,
    });

    if (result) {
      setResults(result.features);
      console.log(`Encontrados ${result.metadata.totalIntersecting} puntos en el distrito`);
      
      // Renderizar puntos en el mapa
      renderPointsOnMap(result.features);
    }
  };

  return (
    <div>
      <h2>Análisis Espacial</h2>
      {loading && <p>Cargando features...</p>}
      {error && <p className="error">{error}</p>}
      {results.length > 0 && (
        <div>
          <h3>Resultados: {results.length} puntos encontrados</h3>
          <ul>
            {results.map((feature, idx) => (
              <li key={idx}>
                {feature.properties.name || `Feature ${idx + 1}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

---

## 🗺️ Integración con Leaflet

```javascript
import L from 'leaflet';
import axios from 'axios';

// 1. Crear mapa
const map = L.map('map').setView([14.5965, -90.5089], 10);

// 2. Agregar capa de distritos (multipolygon)
let districtLayer;
axios.get('/api/v1/layers/32/geojson').then(response => {
  districtLayer = L.geoJSON(response.data, {
    style: {
      fillColor: '#3388ff',
      fillOpacity: 0.2,
      color: '#3388ff',
      weight: 2
    },
    onEachFeature: (feature, layer) => {
      layer.on('click', async () => {
        // 3. Cuando se hace clic en un distrito, buscar puntos dentro
        const pointsResponse = await axios.post(
          '/api/v1/layers/16/geojson/intersects',
          { geometry: feature.geometry }
        );

        // 4. Limpiar puntos anteriores y agregar nuevos
        if (window.pointsLayer) {
          map.removeLayer(window.pointsLayer);
        }

        window.pointsLayer = L.geoJSON(pointsResponse.data, {
          pointToLayer: (feature, latlng) => {
            return L.circleMarker(latlng, {
              radius: 6,
              fillColor: '#ff7800',
              color: '#000',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.8
            });
          },
          onEachFeature: (feature, layer) => {
            layer.bindPopup(feature.properties.name || 'Sin nombre');
          }
        }).addTo(map);

        // 5. Zoom a los puntos encontrados
        if (pointsResponse.data.features.length > 0) {
          map.fitBounds(window.pointsLayer.getBounds());
        }

        // 6. Mostrar información
        console.log(`Encontrados ${pointsResponse.data.metadata.totalIntersecting} puntos`);
      });
    }
  }).addTo(map);
});
```

---

## 🗺️ Integración con Mapbox GL JS

```javascript
import mapboxgl from 'mapbox-gl';
import axios from 'axios';

// 1. Inicializar mapa
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-90.5089, 14.5965],
  zoom: 10
});

map.on('load', async () => {
  // 2. Cargar capa de distritos
  const districtsResponse = await axios.get('/api/v1/layers/32/geojson');
  
  map.addSource('districts', {
    type: 'geojson',
    data: districtsResponse.data
  });

  map.addLayer({
    id: 'districts-fill',
    type: 'fill',
    source: 'districts',
    paint: {
      'fill-color': '#3388ff',
      'fill-opacity': 0.2
    }
  });

  map.addLayer({
    id: 'districts-outline',
    type: 'line',
    source: 'districts',
    paint: {
      'line-color': '#3388ff',
      'line-width': 2
    }
  });

  // 3. Click en distrito para buscar puntos
  map.on('click', 'districts-fill', async (e) => {
    const districtGeometry = e.features[0].geometry;

    // 4. Buscar puntos que intersectan
    const pointsResponse = await axios.post(
      '/api/v1/layers/16/geojson/intersects',
      { geometry: districtGeometry }
    );

    // 5. Actualizar/agregar capa de puntos
    if (map.getSource('filtered-points')) {
      map.getSource('filtered-points').setData(pointsResponse.data);
    } else {
      map.addSource('filtered-points', {
        type: 'geojson',
        data: pointsResponse.data
      });

      map.addLayer({
        id: 'filtered-points-circle',
        type: 'circle',
        source: 'filtered-points',
        paint: {
          'circle-radius': 6,
          'circle-color': '#ff7800',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#000'
        }
      });
    }

    // 6. Zoom a resultados
    if (pointsResponse.data.features.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      pointsResponse.data.features.forEach(feature => {
        bounds.extend(feature.geometry.coordinates);
      });
      map.fitBounds(bounds, { padding: 50 });
    }

    // 7. Mostrar info
    console.log(`${pointsResponse.data.metadata.totalIntersecting} puntos en distrito`);
  });

  // Cambiar cursor al hover
  map.on('mouseenter', 'districts-fill', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'districts-fill', () => {
    map.getCanvas().style.cursor = '';
  });
});
```

---

## ⚡ Optimización y Mejores Prácticas

### 1. **Usar simplify para geometrías complejas**
```javascript
// Si la capa tiene geometrías muy detalladas que no necesitas ver
const response = await axios.post(
  `/api/v1/layers/${layerId}/geojson/intersects?simplify=true`,
  { geometry: polygonGeometry }
);
```

### 2. **Limitar cantidad de features**
```javascript
// Si solo necesitas una muestra o preview
const response = await axios.post(
  `/api/v1/layers/${layerId}/geojson/intersects?maxFeatures=100`,
  { geometry: polygonGeometry }
);
```

### 3. **Caché de resultados**
```javascript
// Guardar resultados para no repetir queries
const cacheKey = `intersect_${layerId}_${districtId}`;
const cached = sessionStorage.getItem(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await getIntersectingFeatures({...});
sessionStorage.setItem(cacheKey, JSON.stringify(result));
```

### 4. **Mostrar loading y progreso**
```javascript
const [isAnalyzing, setIsAnalyzing] = useState(false);

const analyzeArea = async (geometry) => {
  setIsAnalyzing(true);
  try {
    const result = await axios.post(...);
    // Procesar resultado
  } finally {
    setIsAnalyzing(false);
  }
};
```

---

## 🚨 Manejo de Errores

### Errores Comunes

#### 1. **Geometría Inválida (400)**
```javascript
try {
  const response = await axios.post(...);
} catch (error) {
  if (error.response?.status === 400) {
    console.error('Geometría inválida:', error.response.data.message);
    alert('La geometría seleccionada no es válida');
  }
}
```

#### 2. **Capa No Encontrada (404)**
```javascript
if (error.response?.status === 404) {
  console.error('Capa no encontrada');
  alert('La capa seleccionada ya no existe');
}
```

#### 3. **Demasiadas Features (metadata.limited = true)**
```javascript
if (response.data.metadata.limited) {
  alert(response.data.metadata.message);
  // "Mostrando 5000 de 12543 features que intersectan con la geometría."
}
```

---

## 📊 Comparación con Otros Endpoints

| Endpoint | Uso | Ventaja |
|----------|-----|---------|
| `GET /layers/:id/geojson` | Obtener toda la capa | Simple, pero puede ser lento |
| `GET /layers/:id/geojson/bbox` | Features en viewport (rectángulo) | Rápido para zoom/pan |
| `POST /layers/:id/geojson/intersects` | Features que tocan una geometría | **Análisis espacial preciso** |
| `GET /layers/:id/features/filter` | Filtrar por propiedades | Filtros por atributos |

---

## 🎓 Ejemplos de Flujos Completos

### Flujo 1: Selección de Distrito → Ver Puntos

```javascript
// Estado inicial
const [selectedDistrict, setSelectedDistrict] = useState(null);
const [pointsInDistrict, setPointsInDistrict] = useState([]);

// 1. Usuario hace clic en distrito
const handleDistrictClick = async (districtFeature) => {
  setSelectedDistrict(districtFeature);
  
  // 2. Buscar puntos en ese distrito
  const response = await axios.post(
    '/api/v1/layers/16/geojson/intersects',
    { geometry: districtFeature.geometry }
  );
  
  // 3. Actualizar mapa y UI
  setPointsInDistrict(response.data.features);
  renderPoints(response.data.features);
  
  // 4. Mostrar estadísticas
  showStats({
    distrito: districtFeature.properties.nombre,
    totalPuntos: response.data.metadata.totalIntersecting
  });
};
```

### Flujo 2: Comparar Dos Áreas

```javascript
const compareAreas = async (geometry1, geometry2, pointsLayerId) => {
  // Buscar puntos en área 1
  const area1Response = await axios.post(
    `/api/v1/layers/${pointsLayerId}/geojson/intersects`,
    { geometry: geometry1 }
  );
  
  // Buscar puntos en área 2
  const area2Response = await axios.post(
    `/api/v1/layers/${pointsLayerId}/geojson/intersects`,
    { geometry: geometry2 }
  );
  
  // Comparar resultados
  console.log('Área 1:', area1Response.data.metadata.totalIntersecting, 'puntos');
  console.log('Área 2:', area2Response.data.metadata.totalIntersecting, 'puntos');
  
  return {
    area1: area1Response.data.features,
    area2: area2Response.data.features
  };
};
```

---

## 📞 Soporte

Si tienes dudas sobre este endpoint:
1. Revisa los ejemplos de código arriba
2. Consulta la documentación de Swagger: `/api/docs`
3. Contacta al equipo de backend

---

## ✅ Checklist de Implementación

- [ ] Importar axios o cliente HTTP
- [ ] Crear función para llamar al endpoint
- [ ] Manejar estados de loading
- [ ] Manejar errores (400, 404)
- [ ] Validar geometría antes de enviar
- [ ] Mostrar resultados en el mapa
- [ ] Mostrar estadísticas (total encontrado)
- [ ] Considerar límite de features
- [ ] Implementar caché si es necesario
- [ ] Probar con diferentes tipos de geometría

---

**Última actualización:** Diciembre 2025  
**Versión API:** v1
