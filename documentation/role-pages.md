# Pages Module - Guía de Uso

## 📋 Descripción

El módulo de **Pages** permite al administrador crear páginas dinámicas del lado del cliente con un sistema de permisos basado en roles. Esto proporciona flexibilidad total para construir menús de navegación personalizados según el rol del usuario.

## 🏗️ Arquitectura

```
Page (1) ←→ (N) RolePage (N) ←→ (1) Role
```

- **Page**: Representa una página/vista en el sistema
- **RolePage**: Tabla de unión que asocia páginas con roles
- **Role**: Define los roles del sistema

## 📊 Entidad Page

```typescript
{
  id: number;
  name: string;              // Nombre de la página (3-100 chars)
  description?: string;      // Descripción opcional
  url: string;               // URL única (/dashboard, /users, etc.)
  icon?: string;             // Icono (nombre o clase CSS)
  order: number;             // Orden de visualización (mayor = arriba)
  isActive: boolean;         // Si está activa
  createdAt: Date;
  createdBy: number;
  updatedAt: Date;
  updatedBy: number;
  rolePages: RolePage[];     // Relación con roles
}
```

## 🚀 Endpoints Disponibles

### 1. Crear Página

```bash
POST /pages?userId=1
Content-Type: application/json

{
  "name": "Dashboard Principal",
  "description": "Panel de control con métricas generales",
  "url": "/dashboard",
  "icon": "dashboard",
  "order": 10,
  "isActive": true,
  "roleIds": [1, 2, 3]  // Asociar a roles admin, supervisor, operador
}
```

**Respuesta:**
```json
{
  "id": 1,
  "name": "Dashboard Principal",
  "description": "Panel de control con métricas generales",
  "url": "/dashboard",
  "icon": "dashboard",
  "order": 10,
  "isActive": true,
  "roles": [
    {
      "id": 1,
      "name": "admin",
      "description": "Administrador del sistema"
    },
    {
      "id": 2,
      "name": "supervisor",
      "description": "Supervisor de operaciones"
    }
  ],
  "createdAt": "2025-11-25T...",
  "updatedAt": "2025-11-25T..."
}
```

### 2. Obtener Todas las Páginas (con paginación y filtros)

```bash
GET /pages?page=1&limit=10&isActive=true&search=dashboard
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Dashboard Principal",
      "url": "/dashboard",
      "icon": "dashboard",
      "order": 10,
      "isActive": true,
      "roles": [
        { "id": 1, "name": "admin", "description": "..." }
      ]
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

### 3. Obtener Páginas por Rol

```bash
GET /pages/role/1?isActive=true
```

**Respuesta:**
```json
{
  "roleId": 1,
  "roleName": "admin",
  "pages": [
    {
      "id": 1,
      "name": "Dashboard",
      "url": "/dashboard",
      "icon": "dashboard",
      "order": 10
    },
    {
      "id": 2,
      "name": "Usuarios",
      "url": "/users",
      "icon": "people",
      "order": 9
    }
  ]
}
```

### 4. Obtener Página por ID

```bash
GET /pages/1
```

**Respuesta:**
```json
{
  "id": 1,
  "name": "Dashboard Principal",
  "description": "Panel de control",
  "url": "/dashboard",
  "icon": "dashboard",
  "order": 10,
  "isActive": true,
  "roles": [
    {
      "id": 1,
      "name": "admin",
      "description": "Administrador del sistema",
      "isActive": true
    }
  ],
  "createdAt": "2025-11-25T...",
  "createdBy": 1,
  "updatedAt": "2025-11-25T...",
  "updatedBy": 1
}
```

### 5. Actualizar Página

```bash
PATCH /pages/1?userId=1
Content-Type: application/json

{
  "name": "Dashboard Actualizado",
  "order": 15,
  "roleIds": [1, 2, 3, 4]  // Agregar más roles
}
```

### 6. Reordenar Páginas

```bash
PATCH /pages/reorder?userId=1
Content-Type: application/json

{
  "pages": [
    { "id": 1, "order": 10 },
    { "id": 2, "order": 9 },
    { "id": 3, "order": 8 },
    { "id": 4, "order": 7 }
  ]
}
```

**Respuesta:**
```json
{
  "message": "Páginas reordenadas exitosamente",
  "updated": 4
}
```

### 7. Eliminar Página (Soft Delete)

```bash
DELETE /pages/1?userId=1
```

**Respuesta:**
```json
{
  "message": "Página desactivada exitosamente",
  "id": 1
}
```

### 8. Obtener Estadísticas

```bash
GET /pages/stats
```

**Respuesta:**
```json
{
  "total": 50,
  "active": 45,
  "inactive": 5,
  "topPagesByRoles": [
    {
      "id": 1,
      "name": "Dashboard",
      "roleCount": 5
    },
    {
      "id": 2,
      "name": "Reportes",
      "roleCount": 4
    }
  ]
}
```

## 🔄 Flujo de Uso Típico

### Escenario 1: Configurar Menú de Navegación para Admin

```bash
# 1. Crear página de Dashboard
POST /pages?userId=1
{
  "name": "Dashboard",
  "url": "/dashboard",
  "icon": "dashboard",
  "order": 10,
  "roleIds": [1]  # Solo admin
}

# 2. Crear página de Usuarios
POST /pages?userId=1
{
  "name": "Gestión de Usuarios",
  "url": "/users",
  "icon": "people",
  "order": 9,
  "roleIds": [1]
}

# 3. Crear página de Mapas
POST /pages?userId=1
{
  "name": "Mapas",
  "url": "/maps",
  "icon": "map",
  "order": 8,
  "roleIds": [1, 2]  # Admin y supervisor
}

# 4. Obtener menú del admin (roleId=1)
GET /pages/role/1?isActive=true
```

### Escenario 2: Sistema Dinámico de Navegación

```typescript
// Frontend: Obtener páginas del usuario según su rol
async function loadUserMenu(roleId: number) {
  const response = await fetch(`/pages/role/${roleId}?isActive=true`);
  const { pages } = await response.json();
  
  // Ordenar por order (descendente)
  return pages.sort((a, b) => b.order - a.order);
}

// Ejemplo de uso en React/Vue
const menu = await loadUserMenu(userRoleId);

// Renderizar menú dinámicamente
menu.forEach(page => {
  createMenuItem({
    name: page.name,
    url: page.url,
    icon: page.icon
  });
});
```

### Escenario 3: Agregar Nueva Funcionalidad al Sistema

```bash
# 1. Desarrollador crea nueva página de "Análisis"
POST /pages?userId=1
{
  "name": "Análisis Avanzado",
  "description": "Análisis de datos con IA",
  "url": "/analytics",
  "icon": "analytics",
  "order": 5,
  "roleIds": [1, 2]  # Admin y analista
}

# 2. Sin código adicional, la página aparecerá automáticamente
#    en el menú de usuarios con roleId 1 o 2
```

## ⚠️ Validaciones y Restricciones

### Validaciones de Negocio

1. **URL Única**: No pueden existir dos páginas activas con la misma URL
2. **Formato de URL**: Debe iniciar con `/` y solo contener letras, números, `/`, `_`, `-`
3. **Nombre**: Entre 3 y 100 caracteres
4. **Order**: No puede ser negativo
5. **Roles Válidos**: Al asociar roles, deben existir y estar activos

### Errores Comunes

```json
// Error: URL duplicada
{
  "statusCode": 409,
  "message": "Ya existe una página con la URL: /dashboard"
}

// Error: Rol no existe
{
  "statusCode": 400,
  "message": "Algunos roles no existen o están inactivos"
}

// Error: URL inválida
{
  "statusCode": 400,
  "message": [
    "La URL debe iniciar con / y solo contener letras, números, /, _ y -"
  ]
}
```

## 🔐 Integración con Sistema de Autenticación

### TODO: Implementar Guards JWT

Actualmente se usa `userId` como query param (temporal). En producción:

```typescript
// pages.controller.ts (futuro)
@UseGuards(JwtAuthGuard)
@Post()
create(
  @Body() createPageDto: CreatePageDto,
  @CurrentUser() user: User,  // Extraído del token JWT
) {
  return this.pagesService.create(createPageDto, user.id);
}

// Middleware de permisos
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')  // Solo admin puede crear páginas
@Post()
create(...) { ... }
```

## 📊 Casos de Uso Avanzados

### 1. Páginas Jerárquicas (con parentId)

**Futuro**: Agregar soporte para sub-páginas

```typescript
// Agregar a la entidad Page
@Column({ name: 'parent_id', nullable: true })
parentId?: number;

@ManyToOne(() => Page, page => page.children)
@JoinColumn({ name: 'parent_id' })
parent?: Page;

@OneToMany(() => Page, page => page.parent)
children?: Page[];
```

### 2. Páginas con Configuración JSON

```bash
POST /pages?userId=1
{
  "name": "Mapa Personalizado",
  "url": "/map/custom",
  "icon": "map",
  "order": 5,
  "metadata": {  // Campo JSONB opcional
    "defaultZoom": 12,
    "defaultCenter": [-90.5069, 14.6349],
    "layers": [1, 2, 3]
  }
}
```

### 3. Búsqueda Avanzada

```typescript
// Futuro: Agregar método de búsqueda avanzada
async searchPages(filters: {
  name?: string;
  url?: string;
  hasRole?: number;
  minOrder?: number;
  maxOrder?: number;
}) {
  // Implementación con QueryBuilder
}
```

## 🎯 Beneficios del Sistema

1. **Dinamismo Total**: Sin recompilar el frontend para agregar páginas
2. **Control de Permisos**: Asociación flexible página-rol
3. **Ordenamiento**: Control visual del menú con `order`
4. **Soft Delete**: Páginas desactivadas no se pierden
5. **Auditoría**: Registro de quién crea/actualiza cada página
6. **Transacciones**: Integridad de datos garantizada (página + role-pages)

## 🚀 Próximos Pasos

- [ ] Implementar autenticación JWT
- [ ] Agregar guards de permisos (@Roles decorator)
- [ ] Sistema de páginas jerárquicas (parent-child)
- [ ] Cache de páginas por rol (Redis)
- [ ] Versionado de páginas
- [ ] Páginas con metadata JSONB personalizada
- [ ] WebSockets para actualización en tiempo real del menú
