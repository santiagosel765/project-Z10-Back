# TypeORM Entities - ZENIT GEOAI Platform

Este documento describe todas las entidades de TypeORM generadas para la plataforma ZENIT GEOAI basadas en el esquema de PostgreSQL con PostGIS.

## Estructura de la Base de Datos

### Entidades Principales

#### 1. User (`user`)
- **Descripción**: Usuarios de la plataforma con autenticación y campos de auditoría
- **Ubicación**: `src/modules/users/entities/user.entity.ts`
- **Campos principales**:
  - `id`: Clave primaria auto-incremental
  - `firstName`, `lastName`: Nombres del usuario
  - `employeeCode`: Código único de empleado
  - `email`: Email único del usuario
  - `phone`: Teléfono (opcional)
  - `profilePhotoUrl`: URL de foto de perfil
  - `password`: Contraseña encriptada
  - `isActive`: Estado activo/inactivo
  - Campos de auditoría: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

#### 2. Role (`role`)
- **Descripción**: Roles del sistema para control de acceso
- **Ubicación**: `src/modules/roles/entities/role.entity.ts`
- **Campos principales**:
  - `id`: Clave primaria
  - `name`: Nombre único del rol (formato: snake_case)
  - `description`: Descripción del rol
  - `isActive`: Estado activo/inactivo
  - Campos de auditoría

#### 3. Page (`page`)
- **Descripción**: Páginas/rutas disponibles para el menú de navegación
- **Ubicación**: `src/modules/pages/entities/page.entity.ts`
- **Campos principales**:
  - `id`: Clave primaria
  - `name`: Nombre de la página
  - `url`: URL única de la página
  - `icon`: Icono para el menú
  - `order`: Orden en el menú
  - `isActive`: Estado activo/inactivo
  - Campos de auditoría

#### 4. Map (`map`)
- **Descripción**: Configuraciones de WebMaps de ArcGIS
- **Ubicación**: `src/modules/maps/entities/map.entity.ts`
- **Campos principales**:
  - `id`: Clave primaria
  - `name`: Nombre del mapa
  - `webmapItemId`: ID del WebMap de ArcGIS
  - `mapType`: Tipo de mapa (general, operations, analytics)
  - `isDefault`: Indica si es el mapa por defecto (solo uno puede serlo)
  - `settings`: Configuraciones adicionales (JSONB)
  - Campos de auditoría

#### 5. Layer (`layer`)
- **Descripción**: Capas GeoJSON subidas por usuarios, almacenadas como geometrías PostGIS
- **Ubicación**: `src/modules/layers/entities/layer.entity.ts`
- **Campos principales**:
  - `id`: Clave primaria
  - `name`: Nombre de la capa
  - `userId`: ID del usuario propietario
  - `layerType`: Tipo de geometría (point, linestring, polygon, etc.)
  - `totalFeatures`: Número total de features
  - `bboxGeometry`: Bounding box de todas las geometrías
  - `style`: Configuración de estilo (JSONB)
  - `isPublic`: Si la capa es pública
  - `sharedWith`: Array de IDs de usuarios con acceso
  - `originalFilename`: Nombre del archivo original
  - Campos de auditoría

### Entidades de Relación (Junction Tables)

#### 6. UserRole (`user_role`)
- **Descripción**: Relación muchos-a-muchos entre usuarios y roles
- **Ubicación**: `src/modules/users/entities/user-role.entity.ts`
- **Campos**: `userId`, `roleId`, `createdAt`, `createdBy`

#### 7. RolePage (`role_page`)
- **Descripción**: Control de acceso basado en roles para páginas
- **Ubicación**: `src/modules/roles/entities/role-page.entity.ts`
- **Campos**: `roleId`, `pageId`, `createdAt`, `createdBy`

#### 8. LayerFeature (`layer_feature`)
- **Descripción**: Features individuales de las capas con geometrías PostGIS
- **Ubicación**: `src/modules/layers/entities/layer-feature.entity.ts`
- **Campos principales**:
  - `id`: Clave primaria (BIGSERIAL)
  - `layerId`: Referencia a la capa
  - `featureIndex`: Índice del feature en el GeoJSON original
  - `geometry`: Geometría PostGIS (SRID 4326)
  - `properties`: Propiedades del feature (JSONB)

## Relaciones entre Entidades

### Relaciones One-to-Many
- `User` → `Layer` (un usuario puede tener múltiples capas)
- `Layer` → `LayerFeature` (una capa contiene múltiples features)
- `User` → `UserRole` (un usuario puede tener múltiples roles)
- `Role` → `UserRole` (un rol puede ser asignado a múltiples usuarios)
- `Role` → `RolePage` (un rol puede acceder a múltiples páginas)
- `Page` → `RolePage` (una página puede ser accedida por múltiples roles)

### Relaciones de Auditoría
Todas las entidades principales tienen relaciones de auditoría con `User`:
- `createdByUser`: Usuario que creó el registro
- `updatedByUser`: Usuario que actualizó el registro

## Características Especiales

### PostGIS Support
- Las entidades `Layer` y `LayerFeature` utilizan tipos de geometría PostGIS
- SRID 4326 (WGS84) para todas las geometrías
- Índices espaciales para búsquedas eficientes

### JSONB Fields
- `Map.settings`: Configuraciones flexibles del mapa
- `Layer.style`: Configuración de estilo de la capa
- `LayerFeature.properties`: Propiedades del feature GeoJSON

### Constraints y Validaciones
- Email y phone con validación por regex
- URLs con formato específico
- Nombres de rol en snake_case
- Solo un mapa puede ser default

### Índices Optimizados
- Índices condicionales para registros activos
- Índices espaciales para geometrías
- Índices GIN para campos JSONB y arrays

## Uso en TypeORM

```typescript
// Importar todas las entidades
import {
  User, Role, Page, Map, Layer,
  UserRole, RolePage, LayerFeature
} from '../entities';

// Configurar en TypeORM
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, Role, Page, Map, Layer,
      UserRole, RolePage, LayerFeature
    ])
  ]
})
export class DatabaseModule {}
```

## Migraciones

Las entidades están listas para generar migraciones de TypeORM que coincidan con el esquema SQL proporcionado. Asegúrate de:

1. Tener PostGIS habilitado en PostgreSQL
2. Configurar las extensiones necesarias
3. Ejecutar las migraciones en el orden correcto de dependencias

## Notas Importantes

- Las geometrías se almacenan como strings WKT/WKB en TypeORM
- Los triggers de auto-actualización de `updated_at` deben configurarse a nivel de base de datos
- Las validaciones complejas pueden requerir decoradores adicionales o validación a nivel de servicio
- El constraint de "solo un mapa default" debe manejarse en la lógica de negocio