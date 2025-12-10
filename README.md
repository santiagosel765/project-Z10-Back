# Zenit - Backend

Backend API para la plataforma Zenit construida con NestJS, TypeORM y PostgreSQL con extensiones PostGIS para manejo de datos geoespaciales.

## 📋 Tabla de Contenidos

- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Variables de Entorno](#-variables-de-entorno)
- [Configuración de Base de Datos](#-configuración-de-base-de-datos)
- [Ejecución del Proyecto](#-ejecución-del-proyecto)
- [Migraciones](#-migraciones)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Scripts Disponibles](#-scripts-disponibles)
- [Arquitectura](#-arquitectura)
- [Contribución](#-contribución)

## 🛠 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (v18 o superior)
- **npm** o **yarn**
- **PostgreSQL** (v13 o superior)
- **PostGIS** extension para PostgreSQL
- **Git**

### Configuración de PostgreSQL con PostGIS

```sql
-- Conectar a PostgreSQL como superusuario
-- Crear la base de datos
CREATE DATABASE zenit_db;

-- Conectar a la base de datos creada
\c zenit_db;

-- Habilitar extensiones PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
```

## 🚀 Instalación

1. **Clonar el repositorio**

   ```bash
   git clone <repository-url>
   cd zenit-backend
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Configurar variables de entorno** (ver sección siguiente)

4. **Ejecutar migraciones** (si aplica)
   ```bash
   npm run migration:run
   ```

## 🔐 Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# =====================================
# SERVIDOR
# =====================================
PORT=3200
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:9002
NODE_ENV=development

# =====================================
# BASE DE DATOS
# =====================================
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=zenit_db

# =====================================
# JWT AUTHENTICATION
# =====================================
JWT_ACCESS_SECRET=tu_jwt_access_secret_muy_seguro
JWT_REFRESH_SECRET=tu_jwt_refresh_secret_muy_seguro
JWT_ACCESS_EXPIRATION=900
JWT_REFRESH_EXPIRATION=604800

# =====================================
# OPENAI INTEGRATION (Opcional)
# =====================================
OPENAI_API_KEY=sk-tu-openai-api-key
OPENAI_MODEL=gpt-4
```

### 📝 Descripción de Variables

| Variable                 | Descripción                                | Valor por defecto       |
| ------------------------ | ------------------------------------------ | ----------------------- |
| `PORT`                   | Puerto del servidor                        | `3200`                  |
| `API_PREFIX`             | Prefijo para todas las rutas API           | `/api/v1`               |
| `CORS_ORIGIN`            | Orígenes permitidos para CORS              | `http://localhost:9002` |
| `NODE_ENV`               | Entorno de ejecución                       | `development`           |
| `DB_HOST`                | Host de PostgreSQL                         | -                       |
| `DB_PORT`                | Puerto de PostgreSQL                       | -                       |
| `DB_USER`                | Usuario de base de datos                   | -                       |
| `DB_PASSWORD`            | Contraseña de base de datos                | -                       |
| `DB_NAME`                | Nombre de la base de datos                 | -                       |
| `JWT_ACCESS_SECRET`      | Secreto para tokens de acceso              | -                       |
| `JWT_REFRESH_SECRET`     | Secreto para tokens de refresh             | -                       |
| `JWT_ACCESS_EXPIRATION`  | Expiración del token de acceso (segundos)  | `900`                   |
| `JWT_REFRESH_EXPIRATION` | Expiración del token de refresh (segundos) | `604800`                |
| `OPENAI_API_KEY`         | Clave API de OpenAI (opcional)             | -                       |
| `OPENAI_MODEL`           | Modelo de OpenAI a usar (opcional)         | -                       |

## 🗄 Configuración de Base de Datos

### Esquema de Base de Datos

El proyecto utiliza un esquema de base de datos completo que incluye:

- **Usuarios** con autenticación y roles
- **Sistema de roles y permisos** basado en páginas
- **Mapas de ArcGIS** con configuraciones flexibles
- **Capas geoespaciales** con soporte PostGIS
- **Features geoespaciales** individuales
- **Auditoría completa** en todas las entidades

### Entidades Principales

- `User` - Usuarios del sistema
- `Role` - Roles de acceso
- `Page` - Páginas/rutas del sistema
- `Map` - Configuraciones de WebMaps
- `Layer` - Capas geoespaciales de usuarios
- `LayerFeature` - Features individuales con geometrías PostGIS
- `UserRole` - Relación usuarios-roles
- `RolePage` - Relación roles-páginas

## ▶️ Ejecución del Proyecto

### Desarrollo

```bash
npm run start:dev
```

### Producción

```bash
npm run build
npm run start:prod
```

### Con Debug

```bash
npm run start:debug
```

El servidor estará disponible en: `http://localhost:3200/api/v1`

## 🔄 Migraciones

Este proyecto utiliza TypeORM con migraciones para el manejo seguro de cambios en la base de datos.

### Configuración de Migraciones

Las migraciones están configuradas en `ormconfig.ts`:

```typescript
export const AppDataSource = new DataSource({
  // ... configuración de conexión
  migrations: ['src/migrations/**/*.ts'],
  synchronize: false,
  migrationsRun: false,
  migrationsTableName: 'migrations',
  migrationsTransactionMode: 'all',
});
```

### Scripts de Migraciones Disponibles

```bash
# Ver el estado actual de las migraciones
npm run migration:show

# Ejecutar todas las migraciones pendientes
npm run migration:run

# Revertir la última migración ejecutada
npm run migration:revert

# Generar una nueva migración basada en cambios en entidades
npm run migration:generate src/migrations/NombreDeLaMigracion

# Crear una migración vacía para cambios manuales
npm run migration:create src/migrations/NombreDeLaMigracion
```

### Flujo de Trabajo con Migraciones

#### 1. **Primera Configuración**

Si ya tienes la base de datos con el esquema inicial:

```bash
# Crear migración inicial (solo si es necesario)
npm run migration:create src/migrations/InitialSchema

# Ejecutar migraciones
npm run migration:run
```

#### 2. **Agregar Nuevos Campos/Tablas**

1. Modifica tu entidad TypeORM:

   ```typescript
   @Entity('user')
   export class User {
     // ... campos existentes

     @Column({ type: 'varchar', length: 500, nullable: true })
     avatarUrl: string; // Nuevo campo
   }
   ```

2. Generar migración automática:

   ```bash
   npm run migration:generate src/migrations/AddUserAvatarField
   ```

3. Revisar la migración generada:

   ```typescript
   export class AddUserAvatarField1699876543210 implements MigrationInterface {
     public async up(queryRunner: QueryRunner): Promise<void> {
       await queryRunner.query(
         `ALTER TABLE "user" ADD "avatarUrl" character varying(500)`,
       );
     }

     public async down(queryRunner: QueryRunner): Promise<void> {
       await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "avatarUrl"`);
     }
   }
   ```

4. Ejecutar la migración:
   ```bash
   npm run migration:run
   ```

#### 3. **Migraciones Manuales (Datos, Funciones, etc.)**

Para cambios que no puede detectar TypeORM automáticamente:

```bash
# Crear migración vacía
npm run migration:create src/migrations/SeedInitialRoles
```

Editar manualmente:

```typescript
export class SeedInitialRoles1699876543210 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "role" (name, description, is_active) VALUES 
      ('admin', 'Administrator role', true),
      ('user', 'Regular user role', true),
      ('viewer', 'Read-only user role', true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "role" WHERE name IN ('admin', 'user', 'viewer')`,
    );
  }
}
```

#### 4. **Verificar Estado de Migraciones**

```bash
# Ver qué migraciones han sido ejecutadas
npm run migration:show

# Ejemplo de salida:
# [X] InitialSchema1699876543210
# [X] AddUserAvatarField1699876543211
# [ ] SeedInitialRoles1699876543212    <- Pendiente
```

### ⚠️ Mejores Prácticas para Migraciones

1. **Siempre revisar** las migraciones generadas automáticamente
2. **Hacer backup** antes de ejecutar migraciones en producción
3. **Probar migraciones** en ambiente de desarrollo primero
4. **No editar** migraciones ya ejecutadas en producción
5. **Usar transacciones** para cambios complejos
6. **Documentar** migraciones manuales complejas

### 🚨 Solución de Problemas

#### Error: "Migration already exists"

```bash
# Ver migraciones existentes
npm run migration:show

# Si necesitas forzar una migración específica
# (¡CUIDADO! Solo en desarrollo)
```

#### Error: "Cannot run migrations"

```bash
# Verificar configuración de base de datos
# Verificar que PostgreSQL esté ejecutándose
# Verificar permisos del usuario de base de datos
```

#### Revertir cambios problemáticos

```bash
# Revertir la última migración
npm run migration:revert

# Esto ejecutará el método 'down()' de la última migración
```

## 📁 Estructura del Proyecto

```
src/
├── common/                 # Código compartido
│   ├── decorators/         # Decoradores personalizados
│   ├── filters/           # Exception filters globales
│   ├── guards/            # Guards de autenticación/autorización
│   ├── interfaces/        # Interfaces compartidas
│   └── pipes/             # Pipes de transformación/validación
├── config/                # Configuración de la aplicación
│   └── envs.ts           # Variables de entorno
├── entities/              # Índice de entidades TypeORM
├── migrations/            # Migraciones de base de datos
├── modules/               # Módulos de la aplicación
│   ├── auth/             # Autenticación y autorización
│   ├── users/            # Gestión de usuarios
│   ├── roles/            # Gestión de roles
│   ├── pages/            # Gestión de páginas/rutas
│   ├── maps/             # Gestión de mapas ArcGIS
│   └── layers/           # Gestión de capas geoespaciales
├── utils/                # Utilidades y helpers
├── app.module.ts         # Módulo principal
└── main.ts              # Punto de entrada de la aplicación
```

## 🌐 API Endpoints

### Autenticación

- `POST /api/v1/auth/login` - Iniciar sesión
- `POST /api/v1/auth/refresh` - Renovar token
- `POST /api/v1/auth/logout` - Cerrar sesión

### Usuarios

- `GET /api/v1/users` - Listar usuarios
- `POST /api/v1/users` - Crear usuario
- `GET /api/v1/users/:id` - Obtener usuario
- `PATCH /api/v1/users/:id` - Actualizar usuario
- `DELETE /api/v1/users/:id` - Eliminar usuario

### Roles

- `GET /api/v1/roles` - Listar roles
- `POST /api/v1/roles` - Crear rol
- `GET /api/v1/roles/:id` - Obtener rol
- `PATCH /api/v1/roles/:id` - Actualizar rol

### Mapas

- `GET /api/v1/maps` - Listar mapas
- `POST /api/v1/maps` - Crear configuración de mapa
- `GET /api/v1/maps/:id` - Obtener mapa
- `PATCH /api/v1/maps/:id` - Actualizar mapa

### Capas Geoespaciales

- `GET /api/v1/layers` - Listar capas del usuario
- `POST /api/v1/layers` - Subir nueva capa GeoJSON
- `GET /api/v1/layers/:id` - Obtener capa y features
- `PATCH /api/v1/layers/:id` - Actualizar capa
- `DELETE /api/v1/layers/:id` - Eliminar capa

## 🧪 Scripts Disponibles

```bash
# Desarrollo
npm run start:dev          # Ejecutar en modo desarrollo
npm run start:debug        # Ejecutar con debugger

# Build y Producción
npm run build              # Construir para producción
npm run start:prod         # Ejecutar versión de producción

# Testing
npm run test               # Ejecutar tests unitarios
npm run test:watch         # Tests en modo watch
npm run test:cov           # Tests con coverage
npm run test:e2e          # Tests end-to-end

# Calidad de Código
npm run lint              # Lint con ESLint
npm run format            # Formatear con Prettier

# Migraciones
npm run migration:show     # Ver estado de migraciones
npm run migration:run      # Ejecutar migraciones
npm run migration:revert   # Revertir última migración
npm run migration:generate # Generar nueva migración
npm run migration:create   # Crear migración vacía
```

## 🏗 Arquitectura

### Stack Tecnológico

- **Framework**: NestJS
- **ORM**: TypeORM
- **Base de Datos**: PostgreSQL + PostGIS
- **Autenticación**: JWT
- **Validación**: class-validator + class-transformer
- **Testing**: Jest
- **Documentación**: Swagger/OpenAPI (próximamente)

### Patrones de Diseño

- **Módulos**: Separación por dominio funcional
- **DTOs**: Data Transfer Objects para validación
- **Entities**: Mapeo objeto-relacional con TypeORM
- **Services**: Lógica de negocio
- **Controllers**: Capa de presentación/API
- **Guards**: Autenticación y autorización
- **Filters**: Manejo centralizado de excepciones
- **Pipes**: Transformación y validación de datos

### Características Especiales

- **Soporte PostGIS**: Manejo nativo de datos geoespaciales
- **Auditoría Completa**: Tracking de cambios en todas las entidades
- **Sistema de Roles**: Control de acceso basado en roles y páginas
- **Exception Handling**: Manejo centralizado y estructurado de errores
- **Configuración Flexible**: Gestión de configuraciones mediante variables de entorno

## 🤝 Contribución

1. Hacer fork del repositorio
2. Crear una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abrir un Pull Request

### Guías de Contribución

- Seguir las convenciones de código establecidas
- Escribir tests para nuevas funcionalidades
- Actualizar la documentación cuando sea necesario
- Usar migraciones para cambios en la base de datos

---


## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```


## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
