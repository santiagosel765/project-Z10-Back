# Endpoints para `zenit-sdk`

## Auth (usuarios)

### POST /auth/login
- Autentica al usuario y devuelve tokens de acceso/refresh.
- Cuerpo (JSON):
```json
{
  "email": "user@example.com",
  "password": "P@ssw0rd!"
}
```
- Respuesta 200 (JSON):
```json
{
  "accessToken": "<jwt_access>",
  "refreshToken": "<jwt_refresh>",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "roles": ["admin"],
    "employeeCode": "EMP-001"
  }
}
```
- Errores comunes: 401 (`INVALID_CREDENTIALS`).

### POST /auth/refresh
- Envía el refresh token por cookie `__Host-refresh`/`refresh_token` (según entorno) o en header `Authorization: Bearer <refreshToken>`.
- Respuesta 200 (JSON):
```json
{
  "accessToken": "<jwt_access>",
  "refreshToken": "<jwt_refresh>"
}
```
- Errores: 401 (`REFRESH_TOKEN_INVALID`, `TOKEN_INVALID`, `USER_INACTIVE`).

### GET /auth/me
- Header: `Authorization: Bearer <accessToken>`.
- Respuesta 200 (JSON):
```json
{
  "id": 1,
  "email": "user@example.com",
  "roles": ["admin"],
  "employeeCode": "EMP-001"
}
```

### GET /auth/validate
- Header: `Authorization: Bearer <accessToken>`.
- Respuesta 200 (JSON):
```json
{ "valid": true }
```

## SDK Auth (tokens SDK)

### POST /sdk-auth/validate
- El token SDK puede enviarse en el body como `token` o en la cabecera `X-SDK-Token`.
- Respuesta 200 (JSON):
```json
{
  "valid": true,
  "clientId": 10,
  "clientName": "Mobile App Client",
  "scopes": ["maps:read"]
}
```
- Errores: 401 (`SDK_TOKEN_REQUIRED`, `SDK_TOKEN_INVALID`, `SDK_TOKEN_EXPIRED`).

### POST /sdk-auth/exchange
- Envía el token SDK igual que en `/sdk-auth/validate`.
- Respuesta 200 (JSON):
```json
{
  "accessToken": "<jwt>",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```
- Errores: 401 (`SDK_TOKEN_REQUIRED`, `SDK_TOKEN_INVALID`, `SDK_TOKEN_EXPIRED`).

## Notas para `zenit-sdk`
1. Opcionalmente valida el token SDK con `/sdk-auth/validate` para obtener metadatos del cliente.
2. Intercambia el token SDK en `/sdk-auth/exchange` para obtener un JWT de corta duración.
3. Usa `Authorization: Bearer <jwt>` para consumir `/auth/me`, mapas y otros endpoints protegidos.
