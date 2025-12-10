# Endpoints para Features Multipolygon

Documentación completa de los endpoints para manejar features de capas multipolígon con funcionalidades de catálogo, selección y filtrado dinámico.

---

## 📋 Tabla de Contenidos

1. [Obtener Catálogo de Features](#1-obtener-catálogo-de-features)
2. [Obtener Features Seleccionadas por ID](#2-obtener-features-seleccionadas-por-id)
3. [Filtrar Features de UNA Capa](#3-filtrar-features-de-una-capa)
4. [Filtrar Features de MÚLTIPLES Capas](#4-filtrar-features-de-múltiples-capas)

---

## 1. Obtener Catálogo de Features

Retorna un listado de todas las features de una capa multipolígon con metadata y bbox individual, sin las geometrías completas.

### Endpoint

```
GET /api/v1/layers/:id/features/catalog
```

### Parámetros

- **`:id`** (path) - ID de la capa multipolígon

### Caso de Uso

Perfecto para crear interfaces de selección donde el usuario puede ver una lista de features (ej: estados, municipios, distritos) y elegir cuáles visualizar en el mapa sin cargar todas las geometrías.

### Ejemplo de Request

```bash
GET /api/v1/layers/18/features/catalog
Authorization: Bearer YOUR_TOKEN
```

### Respuesta Exitosa (200)

```json
{
  "layerId": 18,
  "layerName": "Distritos",
  "layerType": "multipolygon",
  "totalFeatures": 150,
  "features": [
    {
      "id": 136,
      "featureIndex": 0,
      "properties": {
        "CODDISTRITO": "5",
        "CODREGION": "2",
        "NOMBRE": "Distrito Norte",
        "POBLACION": "125000"
      },
      "bboxGeometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-99.2, 19.4],
            [-99.1, 19.4],
            [-99.1, 19.5],
            [-99.2, 19.5],
            [-99.2, 19.4]
          ]
        ]
      },
      "centroid": {
        "type": "Point",
        "coordinates": [-99.15, 19.45]
      },
      "areaKm2": "45.67",
      "geometryType": "MultiPolygon"
    },
    {
      "id": 137,
      "featureIndex": 1,
      "properties": {
        "CODDISTRITO": "10",
        "CODREGION": "2",
        "NOMBRE": "Distrito Sur"
      },
      "bboxGeometry": {
        "type": "Polygon",
        "coordinates": [...]
      },
      "centroid": {
        "type": "Point",
        "coordinates": [-99.18, 19.38]
      },
      "areaKm2": "52.34",
      "geometryType": "MultiPolygon"
    }
  ]
}
```

### Errores

```json
// 400 - Bad Request (no es multipolygon)
{
  "success": false,
  "statusCode": 400,
  "message": "Esta funcionalidad solo está disponible para capas de tipo multipolygon. Tipo actual: point"
}

// 404 - Not Found
{
  "success": false,
  "statusCode": 404,
  "message": "Capa con ID 999 no encontrada"
}
```

---

## 2. Obtener Features Seleccionadas por ID

Retorna las geometrías completas en formato GeoJSON de features específicas seleccionadas por sus IDs, o todas si no se especifican IDs.

### Endpoint

```
GET /api/v1/layers/:id/features
```

### Parámetros

- **`:id`** (path) - ID de la capa multipolígon
- **`featureIds`** (query, opcional) - Array de IDs de features a obtener

### Caso de Uso

Después de obtener el catálogo, el usuario selecciona features específicas (ej: 3 estados de 32) y este endpoint retorna SOLO las geometrías de esas 3 features seleccionadas.

### Ejemplos de Request

**Obtener features específicas:**

```bash
GET /api/v1/layers/18/features?featureIds=136&featureIds=137&featureIds=140
Authorization: Bearer YOUR_TOKEN
```

**Obtener todas las features:**

```bash
GET /api/v1/layers/18/features
Authorization: Bearer YOUR_TOKEN
```

### Respuesta Exitosa (200)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 136,
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [-99.2, 19.4],
              [-99.1, 19.4],
              [-99.1, 19.5],
              [-99.2, 19.5],
              [-99.2, 19.4]
            ]
          ]
        ]
      },
      "properties": {
        "CODDISTRITO": "5",
        "CODREGION": "2",
        "NOMBRE": "Distrito Norte",
        "POBLACION": "125000",
        "featureIndex": 0,
        "featureId": 136
      }
    },
    {
      "type": "Feature",
      "id": 137,
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [...]
      },
      "properties": {
        "CODDISTRITO": "10",
        "CODREGION": "2",
        "NOMBRE": "Distrito Sur",
        "featureIndex": 1,
        "featureId": 137
      }
    }
  ],
  "metadata": {
    "layerId": 18,
    "layerName": "Distritos",
    "totalFeatures": 2,
    "selectedFeatureIds": [136, 137, 140]
  }
}
```

### Respuesta con Todas las Features

```json
{
  "type": "FeatureCollection",
  "features": [...], // Todas las 150 features
  "metadata": {
    "layerId": 18,
    "layerName": "Distritos",
    "totalFeatures": 150,
    "selectedFeatureIds": "all"
  }
}
```

---

## 3. Filtrar Features de UNA Capa

Filtra features de una capa por propiedades dinámicas con soporte automático para aliases (nombres similares).

### Endpoint

```
GET /api/v1/layers/:id/features/filter
```

### Parámetros

- **`:id`** (path) - ID de la capa multipolígon
- **Query params dinámicos** - Cualquier propiedad de las features (ej: `CODDISTRITO`, `CODREGION`, etc.)
- **`featureIds`** (query, opcional) - Array de IDs para combinar con filtros (AND logic)

### Sistema de Aliases Automático

El sistema detecta propiedades equivalentes ignorando:

- Mayúsculas/minúsculas
- Guiones bajos (`_`), guiones (`-`), espacios
- Convierte `NO` → `COD`
- Normaliza acentos

**Ejemplos de aliases detectados:**

- `CODDISTRITO` = `NO_DISTRIT` = `Cod_Distrito` = `cod-distrito`
- `CODREGION` = `No_REGIÓN` = `Cod_Region`

### Ejemplos de Request

**Filtrar por un distrito:**

```bash
GET /api/v1/layers/18/features/filter?CODDISTRITO=5
Authorization: Bearer YOUR_TOKEN
```

**Filtrar por múltiples distritos (OR logic):**

```bash
GET /api/v1/layers/18/features/filter?CODDISTRITO=5,10,15
Authorization: Bearer YOUR_TOKEN
```

**Filtrar por distrito Y región (AND logic):**

```bash
GET /api/v1/layers/18/features/filter?CODDISTRITO=5&CODREGION=2
Authorization: Bearer YOUR_TOKEN
```

**Combinar filtros con IDs específicos:**

```bash
GET /api/v1/layers/18/features/filter?CODDISTRITO=5&featureIds=136&featureIds=137
Authorization: Bearer YOUR_TOKEN
```

**Filtrar por múltiples propiedades:**

```bash
GET /api/v1/layers/18/features/filter?CODDISTRITO=5,10&CODREGION=2&ESTADO=Activo
Authorization: Bearer YOUR_TOKEN
```

### Respuesta Exitosa (200)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 136,
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [...]
      },
      "properties": {
        "CODDISTRITO": "5",
        "CODREGION": "2",
        "NOMBRE": "Distrito Norte",
        "featureIndex": 0,
        "featureId": 136
      }
    }
  ],
  "metadata": {
    "layerId": 18,
    "layerName": "Distritos",
    "totalFeatures": 1,
    "appliedFilters": {
      "CODDISTRITO": "5",
      "CODREGION": "2"
    },
    "selectedFeatureIds": "none"
  }
}
```

### Respuesta sin Resultados

```json
{
  "type": "FeatureCollection",
  "features": [],
  "metadata": {
    "layerId": 18,
    "layerName": "Distritos",
    "totalFeatures": 0,
    "appliedFilters": {
      "CODDISTRITO": "999"
    },
    "selectedFeatureIds": "none"
  }
}
```

---

## 4. Filtrar Features de MÚLTIPLES Capas

Aplica los mismos filtros a múltiples capas simultáneamente y retorna todas las features que cumplan con los criterios de TODAS las capas combinadas.

### Endpoint

```
GET /api/v1/layers/features/filter-multiple
```

### Parámetros

- **`layerIds`** (query, requerido) - IDs de las capas a filtrar (separados por coma o múltiples params)
- **Query params dinámicos** - Propiedades para filtrar (ej: `CODDISTRITO`, `CODREGION`, etc.)

### Caso de Uso

Tienes 4 capas relacionadas:

- **Distritos** (con `CODDISTRITO`, `CODREGION`)
- **Regiones** (con `CODDISTRITO`, `CODREGION`)
- **Limites-Sucursales** (con `CODDISTRITO`, `CODREGION`)
- **Sectores-Promotor** (con `NO_DISTRIT`, `No_REGIÓN`)

Quieres ver TODAS las features de estas 4 capas donde `CODDISTRITO=5` en una sola petición.

### Ejemplos de Request

**Filtrar 4 capas por distrito 5:**

```bash
GET /api/v1/layers/features/filter-multiple?layerIds=1,2,3,4&CODDISTRITO=5
Authorization: Bearer YOUR_TOKEN
```

**Usando múltiples params (alternativa):**

```bash
GET /api/v1/layers/features/filter-multiple?layerIds=1&layerIds=2&layerIds=3&layerIds=4&CODDISTRITO=5
Authorization: Bearer YOUR_TOKEN
```

**Filtrar por distrito Y región:**

```bash
GET /api/v1/layers/features/filter-multiple?layerIds=1,2,3,4&CODDISTRITO=5&CODREGION=2
Authorization: Bearer YOUR_TOKEN
```

**Filtrar por múltiples valores de distrito:**

```bash
GET /api/v1/layers/features/filter-multiple?layerIds=1,2,3&CODDISTRITO=5,10,15
Authorization: Bearer YOUR_TOKEN
```

### Respuesta Exitosa (200)

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 136,
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [...]
      },
      "properties": {
        "CODDISTRITO": "5",
        "NOMBRE": "Distrito Norte",
        "featureIndex": 0,
        "featureId": 136
      }
    },
    {
      "type": "Feature",
      "id": 245,
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [...]
      },
      "properties": {
        "NO_DISTRIT": "5",
        "NOMBRE": "Sector A",
        "featureIndex": 12,
        "featureId": 245
      }
    },
    {
      "type": "Feature",
      "id": 389,
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [...]
      },
      "properties": {
        "CODDISTRITO": "5",
        "NOMBRE": "Región Centro",
        "featureIndex": 5,
        "featureId": 389
      }
    }
  ],
  "metadata": {
    "totalLayers": 4,
    "totalFeatures": 45,
    "appliedFilters": {
      "CODDISTRITO": "5"
    },
    "layers": [
      {
        "layerId": 1,
        "layerName": "Distritos",
        "featuresCount": 12
      },
      {
        "layerId": 2,
        "layerName": "Regiones",
        "featuresCount": 8
      },
      {
        "layerId": 3,
        "layerName": "Limites-Sucursales",
        "featuresCount": 15
      },
      {
        "layerId": 4,
        "layerName": "Sectores-Promotor",
        "featuresCount": 10
      }
    ]
  }
}
```

### Errores

**400 - Bad Request (sin layerIds):**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "El parámetro layerIds es requerido"
}
```

**400 - Bad Request (capa no multipolygon):**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Las siguientes capas no son de tipo multipolygon: Puntos de Interés, Rutas"
}
```

**404 - Not Found:**

```json
{
  "success": false,
  "statusCode": 404,
  "message": "No se encontraron capas con los IDs proporcionados"
}
```

---

## 🔄 Flujo Completo de Uso

### Escenario: Selección Selectiva de Estados

**Paso 1: Obtener el catálogo**

```bash
GET /api/v1/layers/18/features/catalog
```

→ Retorna listado con 32 estados (IDs, nombres, bboxes) sin geometrías completas (respuesta ligera)

**Paso 2: Usuario selecciona estados en la UI**

```
Usuario marca checkboxes: "Jalisco" (ID: 14), "Nuevo León" (ID: 19), "Yucatán" (ID: 31)
```

**Paso 3: Cargar solo geometrías seleccionadas**

```bash
GET /api/v1/layers/18/features?featureIds=14&featureIds=19&featureIds=31
```

→ Retorna GeoJSON con SOLO esos 3 estados (respuesta optimizada)

**Paso 4: Renderizar en el mapa**

```javascript
map.addSource('estados-seleccionados', {
  type: 'geojson',
  data: response,
});
```

---

### Escenario: Filtrado por Distrito en Múltiples Capas

**Problema:** Tienes 4 capas con datos relacionados y quieres ver todo lo del distrito 5

**Solución: Un solo request**

```bash
GET /api/v1/layers/features/filter-multiple?layerIds=1,2,3,4&CODDISTRITO=5
```

**Resultado:**

- ✅ Features de las 4 capas que tienen `CODDISTRITO=5` o `NO_DISTRIT=5` (aliases automáticos)
- ✅ Un solo GeoJSON combinado
- ✅ Metadata detallada de cuántas features vienen de cada capa

---

## 📊 Comparación de Performance

| Método                   | Features Totales             | Datos Transferidos | Velocidad     |
| ------------------------ | ---------------------------- | ------------------ | ------------- |
| **Sin optimizar**        | 150                          | ~15 MB             | Lento ❌      |
| **Catálogo + Selectivo** | 150 (catalog) + 3 (selected) | ~50 KB + ~200 KB   | Rápido ✅     |
| **Con filtros**          | 5 (filtered)                 | ~150 KB            | Muy Rápido ⚡ |

---

## 🎯 Ventajas del Sistema

### ✅ Catálogo de Features

- Lista completa sin geometrías pesadas
- Incluye bbox para preview en mapa
- Perfecto para interfaces de selección

### ✅ Selección por IDs

- Solo carga lo que el usuario necesita
- Reduce transferencia de datos 95%+
- Mejor UX en capas grandes

### ✅ Filtrado Dinámico

- Propiedades flexibles (no hardcoded)
- Aliases automáticos entre capas
- Combina múltiples criterios (AND/OR)
- Un endpoint para múltiples capas

### ✅ Compatible con

- Mapbox GL JS
- Leaflet
- OpenLayers
- Cualquier librería que acepte GeoJSON

---

## 🔧 Ejemplos de Integración

### JavaScript/Fetch

```javascript
// 1. Obtener catálogo
const catalog = await fetch('/api/v1/layers/18/features/catalog', {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

// 2. Usuario selecciona features
const selectedIds = [136, 137, 140];

// 3. Cargar geometrías seleccionadas
const geojson = await fetch(
  `/api/v1/layers/18/features?${selectedIds.map((id) => `featureIds=${id}`).join('&')}`,
  { headers: { Authorization: `Bearer ${token}` } },
).then((r) => r.json());

// 4. Renderizar
map.addSource('selected-features', { type: 'geojson', data: geojson });
```

### Axios

```javascript
// Filtrar por distrito
const response = await axios.get('/api/v1/layers/18/features/filter', {
  params: {
    CODDISTRITO: '5',
    CODREGION: '2',
  },
  headers: { Authorization: `Bearer ${token}` },
});

// Múltiples capas
const multiResponse = await axios.get(
  '/api/v1/layers/features/filter-multiple',
  {
    params: {
      layerIds: [1, 2, 3, 4],
      CODDISTRITO: '5',
    },
    paramsSerializer: (params) => {
      return Object.entries(params)
        .map(([key, val]) => {
          if (Array.isArray(val)) {
            return val.map((v) => `${key}=${v}`).join('&');
          }
          return `${key}=${val}`;
        })
        .join('&');
    },
    headers: { Authorization: `Bearer ${token}` },
  },
);
```

### React Hook

```javascript
function useLayerFeatures(layerId) {
  const [catalog, setCatalog] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [features, setFeatures] = useState(null);

  useEffect(() => {
    // Cargar catálogo al montar
    fetch(`/api/v1/layers/${layerId}/features/catalog`)
      .then((r) => r.json())
      .then(setCatalog);
  }, [layerId]);

  useEffect(() => {
    if (selectedIds.length === 0) return;

    // Cargar features seleccionadas
    const params = selectedIds.map((id) => `featureIds=${id}`).join('&');
    fetch(`/api/v1/layers/${layerId}/features?${params}`)
      .then((r) => r.json())
      .then(setFeatures);
  }, [layerId, selectedIds]);

  return { catalog, selectedIds, setSelectedIds, features };
}
```

---

## 🎨 Ejemplo de UI

```javascript
// Componente de selector de features
function FeatureSelector({ layerId }) {
  const { catalog, selectedIds, setSelectedIds, features } =
    useLayerFeatures(layerId);

  return (
    <div>
      <h3>Selecciona features ({catalog?.totalFeatures})</h3>

      {/* Filtro rápido por distrito */}
      <input
        placeholder="Filtrar por distrito..."
        onChange={(e) =>
          fetchFiltered(layerId, { CODDISTRITO: e.target.value })
        }
      />

      {/* Lista de features */}
      {catalog?.features.map((feature) => (
        <label key={feature.id}>
          <input
            type="checkbox"
            checked={selectedIds.includes(feature.id)}
            onChange={() => toggleFeature(feature.id)}
          />
          {feature.properties.NOMBRE}({feature.areaKm2} km²)
        </label>
      ))}

      {/* Mapa con features seleccionadas */}
      <Map data={features} />
    </div>
  );
}
```

---

## 📝 Notas Importantes

1. **Solo para capas multipolygon**: Todos estos endpoints validan que la capa sea de tipo `multipolygon`. Si intentas usarlos con otros tipos de geometría, obtendrás error 400.

2. **Aliases case-insensitive**: El sistema de aliases ignora mayúsculas, guiones, espacios. `CODDISTRITO`, `cod_distrito`, `Cod-Distrito` son equivalentes.

3. **Filtros múltiples valores**: Usa comas para valores múltiples de la misma propiedad (OR logic): `CODDISTRITO=5,10,15`

4. **Filtros múltiples propiedades**: Usa `&` entre diferentes propiedades (AND logic): `CODDISTRITO=5&CODREGION=2`

5. **Performance**: El catálogo es muy ligero (solo metadata), las geometrías completas solo se cargan cuando el usuario las necesita.

6. **Límite de features**: No hay límite en los endpoints de filtrado, pero considera paginar en el frontend para capas muy grandes.

---

## 🐛 Troubleshooting

### El filtro no encuentra features

- ✅ Verifica que la propiedad existe en las features
- ✅ Los valores son case-sensitive: `"5"` ≠ `"05"`
- ✅ Revisa la consola para ver los filtros aplicados

### Error 400 "no es multipolygon"

- ✅ Estos endpoints SOLO funcionan con capas de tipo `multipolygon`
- ✅ Verifica el tipo con `GET /api/v1/layers/:id`

### No se detectan aliases

- ✅ El sistema normaliza automáticamente, pero los **valores** deben coincidir exactamente
- ✅ `CODDISTRITO=5` encontrará features con `NO_DISTRIT=5`, pero NO `NO_DISTRIT=05`

---

## 📚 Referencias

- [Documentación de GeoJSON](https://geojson.org/)
- [PostGIS Functions](https://postgis.net/docs/reference.html)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)

---

**Última actualización:** Diciembre 9, 2025
