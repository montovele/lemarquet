# Analisis funcional de integracion Frontend - Suscripciones SaaS

## 1. Alcance confirmado

El frontend consume el estado de suscripcion para mostrar u ocultar modulos. El backend mantiene la autoridad final y vuelve a validar la suscripcion en cada endpoint protegido.

La decision de acceso es:

```text
sesion valida + rol/permisos + cuenta SaaS + suscripcion activa + entitlement activo
```

La cuenta SaaS es la unidad comercial y de cobro. Puede agrupar usuarios y proveedores. `proveedor_id` es alcance operativo de datos; no identifica por si solo una suscripcion.

```text
saas_accounts
  -> saas_account_users -> usuario de sesion
  -> saas_account_providers -> proveedores operativos
```

## 2. Entorno y URL base

El backend Express se publica actualmente en el puerto `3001` y usa la base `ssaxxon_ct_db` mediante `ct/config/db_ct.js`.

Frontend Vite:

```env
VITE_API_URL=http://localhost:3001
VITE_SUBSCRIPTION_ENDPOINT=/suscripciones/account/subscription
```

Produccion:

```env
VITE_API_URL=https://api.example.com
VITE_SUBSCRIPTION_ENDPOINT=/suscripciones/account/subscription
```

Construccion de URL:

```js
const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, '');
const subscriptionEndpoint = import.meta.env.VITE_SUBSCRIPTION_ENDPOINT || '/suscripciones/account/subscription';
const url = `${apiUrl}${subscriptionEndpoint}`;
```

No usar `/account/subscription` como ruta principal. El backend actual la publica bajo `/suscripciones`.

## 3. Inicio de sesion

Antes de consultar suscripciones, el frontend debe iniciar sesion:

```http
POST /auth/login
Content-Type: application/json
```

```js
export async function login(username, password) {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password })
  });

  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'LOGIN_FAILED');
  return body.user;
}
```

El backend guarda `req.session.user` y envia la cookie `connect.sid`. El navegador debe conservarla automaticamente.

Todas las peticiones autenticadas deben incluir:

```js
{ credentials: 'include' }
```

No guardar la cookie en `localStorage`. No enviar `account_id`, `proveedor_id`, plan ni entitlements como autoridad.

## 4. Consulta de la suscripcion propia

```http
GET /suscripciones/account/subscription
Accept: application/json
Cookie: connect.sid=...
```

```js
export async function getMySubscription() {
  const response = await fetch(`${apiUrl}/suscripciones/account/subscription`, {
    credentials: 'include',
    headers: { Accept: 'application/json' }
  });

  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok) throw new Error('SUBSCRIPTION_UNAVAILABLE');

  const body = await response.json();
  return body.data;
}
```

Respuesta actual para la cuenta configurada:

```json
{
  "data": {
    "account_id": 1,
    "status": "active",
    "plan": { "id": "legacy", "name": "Legacy" },
    "current_period_end": null,
    "cancel_at_period_end": false,
    "entitlements": {
      "local_service": true,
      "ct": true,
      "billing": true
    },
    "limits": {}
  }
}
```

Si el usuario no tiene cuenta o suscripcion, el backend devuelve una proyeccion estable con `status: "expired"`, `plan: null`, `entitlements: {}` y `limits: {}`.

## 5. Estados y guardas frontend

Actualmente solo `active` y `trialing` conceden acceso:

```js
export function canUse(subscription, feature) {
  return (
    ['active', 'trialing'].includes(subscription?.status) &&
    subscription?.entitlements?.[feature] === true
  );
}
```

Entitlements disponibles en el catalogo:

```text
local_service
connections
products
imports
shipping
ecommerce
ct
syscom
billing
```

Las guardas frontend solo controlan navegacion y experiencia. El backend debe bloquear tambien el acceso directo a la URL o endpoint.

## 6. Consulta por proveedor relacionado

Un usuario autenticado puede consultar las suscripciones del proveedor que pertenece a su cuenta:

```http
GET /suscripciones/account/providers/21/subscriptions
Cookie: connect.sid=...
```

```js
export async function getProviderSubscriptions(providerId) {
  const response = await fetch(`${apiUrl}/suscripciones/account/providers/${providerId}/subscriptions`, {
    credentials: 'include'
  });

  const body = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(body?.error?.message || 'PROVIDER_SUBSCRIPTIONS_FAILED'), {
      code: body?.error?.code,
      status: response.status
    });
  }
  return body.data;
}
```

El backend resuelve la cuenta desde la sesion y valida `saas_account_providers`. Un proveedor de otra cuenta no debe devolver datos.

El frontend no debe usar un `account_id` de query string para ampliar el alcance.

## 7. Refresh

Despues de un cambio administrativo, el frontend puede reconstruir la proyeccion:

```http
POST /suscripciones/account/subscription/refresh
Cookie: connect.sid=...
```

```js
export async function refreshSubscription() {
  const response = await fetch(`${apiUrl}/suscripciones/account/subscription/refresh`, {
    method: 'POST',
    credentials: 'include'
  });

  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (!response.ok) throw new Error('SUBSCRIPTION_REFRESH_FAILED');
  return (await response.json()).data;
}
```

El backend invalida la clave Redis de la cuenta antes de reconstruir la proyeccion. En despliegues cross-site se debe agregar una estrategia CSRF para esta peticion mutante.

## 8. CRUD administrativo

Estas rutas son para una consola administrativa, no para la vista de un proveedor normal:

```text
GET    /suscripciones/admin/saas/subscriptions
GET    /suscripciones/admin/saas/subscriptions/:subscriptionId
GET    /suscripciones/admin/saas/users/:userId/subscriptions
POST   /suscripciones/admin/saas/accounts/:accountId/subscription
PUT    /suscripciones/admin/saas/accounts/:accountId/subscription
PUT    /suscripciones/admin/saas/subscriptions/:subscriptionId
DELETE /suscripciones/admin/saas/subscriptions/:subscriptionId
PATCH  /suscripciones/admin/saas/accounts/:accountId/entitlements/:featureKey
```

Todas requieren cookie de sesion, acceso administrativo y permiso granular:

```text
saas.subscription.read
saas.subscription.create
saas.subscription.update
saas.subscription.cancel
saas.entitlement.update
```

El backend reconoce un usuario con `rol: "admin"` o `isAdminUser: true`, pero el permiso granular sigue siendo necesario cuando la sesion trae un catalogo explicito de permisos.

### Implementacion administrativa en el frontend

La consola esta disponible en `/admin/subscriptions` y la ruta requiere autenticacion y rol administrativo. El menu lateral solo muestra el acceso cuando `isAdminUser` es verdadero. Esta comprobacion es de experiencia de usuario; el backend debe seguir siendo la autoridad para el rol y los permisos granulares.

La pantalla implementa este flujo:

1. Carga `GET /suscripciones/admin/saas/subscriptions` al entrar y muestra cuenta, plan y estado.
2. Permite seleccionar una suscripcion del listado o consultar una cuenta concreta con `GET /suscripciones/admin/saas/accounts/:accountId/subscription`.
3. Para crear, primero exige seleccionar un usuario registrado. De esa selección obtiene `user_id` y la cuenta SaaS relacionada; no solicita que el administrador escriba manualmente el ID de cuenta.
4. Permite crear con `POST /suscripciones/admin/saas/accounts/:accountId/subscription`.
5. Permite editar con `PUT /suscripciones/admin/saas/subscriptions/:subscriptionId`.
6. Permite cancelar de forma logica con `DELETE /suscripciones/admin/saas/subscriptions/:subscriptionId`, previa confirmacion.
7. Permite activar o desactivar cada entitlement con `PATCH /suscripciones/admin/saas/accounts/:accountId/entitlements/:featureKey`.

La alta envia `user_id`, `account_id`, `plan_id`, `status`, `started_at`, `cancel_at_period_end` y, cuando se ha capturado, la proyeccion `plan`. La edicion usa el identificador de suscripcion devuelto por el backend y no confunde `user_id`, `proveedor_id` o `account_id` con ese identificador. Si el usuario no tiene cuenta SaaS relacionada, el alta se detiene y se informa la relación faltante.

La consola no usa el refresh de cuenta propia (`POST /suscripciones/account/subscription/refresh`) para cuentas seleccionadas por un administrador. Ese endpoint solo es valido para la cuenta resuelta desde la sesion actual.

### Crear una suscripcion

```http
POST /suscripciones/admin/saas/accounts/1/subscription
Content-Type: application/json
Cookie: connect.sid=...
```

```json
{
  "plan_id": "legacy",
  "status": "active",
  "started_at": "2026-09-02T00:00:00Z",
  "current_period_end": null,
  "cancel_at_period_end": false,
  "reason": "Alta inicial"
}
```

El backend valida que la cuenta y el plan activo existan, guarda auditoria, confirma la transaccion e invalida Redis. Devuelve `201`.

### Cancelar

```http
DELETE /suscripciones/admin/saas/subscriptions/:subscriptionId
```

La operacion es una cancelacion logica: cambia el estado a `canceled`, conserva la fila y registra auditoria.

## 9. Errores frontend

| HTTP | Codigo | Accion |
|---|---|---|
| 401 | `UNAUTHORIZED` | Limpiar estado y redirigir al login |
| 403 | `PERMISSION_DENIED` | Ocultar consola o accion administrativa |
| 403 | `SUBSCRIPTION_REQUIRED` | Mostrar modulo no contratado |
| 403 | `PROVIDER_OUTSIDE_ACCOUNT` | Reportar inconsistencia de cuenta |
| 404 | `ACCOUNT_NOT_FOUND` / `SUBSCRIPTION_NOT_FOUND` | Mostrar recurso inexistente |
| 422 | `INVALID_PLAN` / `INVALID_SUBSCRIPTION_STATUS` | Corregir formulario |
| 503 | `SUBSCRIPTION_UNAVAILABLE` | Bloquear temporalmente sin fallback permisivo |

El frontend debe leer el cuerpo de error antes de mostrar un mensaje:

```js
export async function parseApiError(response) {
  const body = await response.json().catch(() => ({}));
  return {
    status: response.status,
    code: body?.error?.code || body?.message || 'REQUEST_FAILED',
    message: body?.error?.message || body?.message || 'No fue posible completar la operacion.'
  };
}
```

## 10. Ruta CT piloto

```http
GET /ct/saas/pilot
Cookie: connect.sid=...
```

```js
export async function checkCtPilot() {
  const response = await fetch(`${apiUrl}/ct/saas/pilot`, {
    credentials: 'include'
  });
  const body = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(body?.error?.message || 'CT_ACCESS_FAILED'), {
      status: response.status,
      code: body?.error?.code
    });
  }
  return body.data;
}
```

La cadena del backend es:

```text
requireAuth
  -> proveedor_id de la sesion
  -> cuenta SaaS del usuario
  -> proveedor dentro de saas_account_providers
  -> rol permitido
  -> entitlement ct activo
```

La ruta devuelve `account_id` y `proveedor_id` ya resueltos. El frontend no debe enviar ninguno.

## 11. Estado de prueba actual

En `ssaxxon_ct_db` existe:

```text
Cuenta SaaS:       1
Usuario:           8 (usuario_general)
Rol:               proveedor
Proveedor:         21
Suscripcion:       legacy / active
Entitlements:      local_service, ct, billing
```

El usuario `usuario_general` puede consultar su suscripcion y la ruta CT piloto, pero no debe consumir rutas administrativas porque no tiene rol administrativo.

## 12. Verificacion desde el navegador

1. Ejecutar `POST /auth/login` con las credenciales del entorno de desarrollo.
2. Confirmar en DevTools que la respuesta establece `connect.sid`.
3. Ejecutar `GET /suscripciones/account/subscription` con `credentials: include`.
4. Confirmar respuesta `200` y `data.status: "active"`.
5. Confirmar `data.entitlements.ct === true`.
6. Ejecutar `GET /ct/saas/pilot` con la misma sesion.
7. Probar una ruta administrativa con un usuario no admin y confirmar `403`.
8. Abrir `/admin/subscriptions` con una sesion `rol: "admin"` o `isAdminUser: true`.
9. Confirmar que el listado usa `GET /suscripciones/admin/saas/subscriptions` y permite seleccionar una cuenta.
10. Seleccionar un usuario registrado y confirmar que el frontend resuelve su `account_id` antes de abrir el alta.
11. Crear, editar, cambiar un entitlement y cancelar una suscripcion; confirmar que el listado se actualiza despues de cada operacion.
12. Repetir las operaciones con permisos granulares insuficientes y confirmar que la consola muestra el error del backend sin habilitar un fallback permisivo.

## 13. Configuracion de produccion

Antes de publicar:

- Cambiar `cookie.secure` a `true` bajo HTTPS.
- Revisar `SameSite` si frontend y backend usan dominios distintos.
- Restringir `origin` a los dominios reales del frontend.
- Mantener `credentials: true` en CORS.
- Implementar CSRF para POST, PUT, PATCH y DELETE.
- No exponer secretos, cookies, tokens ni payloads de billing en logs.
- Mantener bloqueado el acceso cuando Redis o la base no puedan resolver la suscripcion.

## 14. Pendientes

- Conectar webhooks de billing firmados, idempotentes y auditados.
- Exponer el catalogo de permisos SaaS en la sesion o en un endpoint dedicado para ocultar tambien acciones individuales antes de llamar al backend.
- Migrar gradualmente las rutas CT legacy al enforcement de entitlements.
- Agregar pruebas HTTP end-to-end desde el frontend o un cliente automatizado.
