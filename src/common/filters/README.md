# Exception Filters Documentation

Este directorio contiene los filtros de excepción globales para la aplicación ZENIT GEOAI.

## Filters Implementados

### 1. ValidationExceptionFilter
- **Propósito**: Maneja errores de validación de DTOs
- **Errores que captura**: `BadRequestException` de validaciones
- **Funcionalidad**:
  - Formatea errores de validación de class-validator
  - Extrae el campo específico que falló
  - Proporciona mensajes de error estructurados

### 2. TypeOrmExceptionFilter  
- **Propósito**: Maneja errores específicos de base de datos TypeORM
- **Errores que captura**: `QueryFailedError`, `EntityNotFoundError`
- **Funcionalidad**:
  - Maneja errores de PostgreSQL (códigos específicos)
  - Convierte errores técnicos en mensajes amigables
  - Códigos de error PostgreSQL soportados:
    - `23505`: Violación de unicidad
    - `23503`: Violación de clave foránea  
    - `23502`: Violación de NOT NULL
    - `23514`: Violación de constraint CHECK

### 3. GlobalExceptionFilter
- **Propósito**: Filtro catch-all para todas las demás excepciones
- **Errores que captura**: Cualquier excepción no manejada por otros filtros
- **Funcionalidad**:
  - Maneja HttpExceptions estándar de NestJS
  - Captura errores internos del servidor
  - Logging detallado para debugging
  - Formato consistente de respuesta de error

## Estructura de Respuesta de Error

Todos los filters devuelven un formato consistente:

```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2025-11-12T10:30:00.000Z",
  "path": "/api/v1/users",
  "method": "POST",
  "error": "ValidationError",
  "message": "Validation failed",
  "validationErrors": [
    {
      "field": "email",
      "message": "must be a valid email"
    }
  ]
}
```

## Orden de Aplicación

Los filters se aplican en orden específico (más específico a más general):

1. `ValidationExceptionFilter` - Errores de validación de DTOs
2. `TypeOrmExceptionFilter` - Errores de base de datos  
3. `GlobalExceptionFilter` - Todos los demás errores

## Configuración en main.ts

```typescript
app.useGlobalFilters(
  new ValidationExceptionFilter(), // Más específico
  new TypeOrmExceptionFilter(),    
  new GlobalExceptionFilter()      // Más general
);
```

## Logging

- **Desarrollo**: Se registran detalles completos del error
- **Producción**: Se omiten detalles sensibles de la base de datos
- Todos los errors incluyen: método HTTP, path, código de estado, y timestamp

## Ejemplos de Uso

### Error de Validación
```bash
POST /api/v1/users
{
  "email": "invalid-email",
  "password": ""
}

# Respuesta:
{
  "success": false,
  "statusCode": 400,
  "error": "ValidationError",
  "message": "Validation failed",
  "validationErrors": [
    {"field": "email", "message": "must be a valid email"},
    {"field": "password", "message": "should not be empty"}
  ]
}
```

### Error de Unicidad en BD
```bash
POST /api/v1/users
{
  "email": "existing@email.com",
  "password": "123456"
}

# Respuesta:
{
  "success": false,
  "statusCode": 409,
  "error": "UniqueConstraintViolation", 
  "message": "email already exists"
}
```

### Recurso No Encontrado
```bash
GET /api/v1/users/999

# Respuesta:
{
  "success": false,
  "statusCode": 404,
  "error": "NotFound",
  "message": "Resource not found"
}
```

## Extensión

Para agregar manejo de nuevos tipos de error:

1. Crea un nuevo filter específico en este directorio
2. Extiende de `ExceptionFilter`
3. Usa el decorador `@Catch()` para especificar qué errores capturar
4. Agrega el filter al array en `main.ts` (mantén el orden de especificidad)
5. Actualiza este README con la documentación

## Mejores Prácticas

- **Orden importa**: Filters más específicos primero
- **No exponer información sensible**: Especialmente en producción
- **Logging consistente**: Para facilitar debugging
- **Mensajes amigables**: Convierte errores técnicos en mensajes comprensibles
- **Estructura consistente**: Mantén el mismo formato de respuesta