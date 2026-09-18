# Analisis de compatibilidad Frontend para suscripciones SaaS

## 1. Objetivo

El backend ahora valida la vigencia de la suscripcion usando `current_period_end` y controla el acceso a los modulos mediante `access_allowed` y `entitlements`.

Este documento define como actualizar el frontend sin depender de cambios en la ruta existente:

```http
GET /suscripciones/account/subscription
```

La ruta continua respondiendo con el contrato:

```json
{ "data": { } }
```

La fuente de verdad siempre es el backend. El frontend solo representa el estado y evita mostrar navegacion que el backend rechazara.

## 2. Por que dejaron de mostrarse los modulos

Antes, el frontend normalmente podia decidir con una condicion similar a:

```js
subscription.status === 'active' && subscription.entitlements[feature] === true
```

Despues de agregar la validacion de fecha, una suscripcion cuyo `current_period_end` ya paso se proyecta como:

```json
{
  "status": "expired",
  "access_allowed": false,
  "is_expired": true,
  "entitlements": {},
  "limits": {}
}
```

Por eso los modulos desaparecen correctamente cuando la suscripcion esta vencida. No es un fallo de la ruta `subscription.routes.js`; es el resultado esperado de la nueva regla de acceso.

Tambien existe un segundo caso: si la suscripcion se creo con `current_period_end: null`, el backend no puede calcular dias restantes. En ese caso el frontend debe mostrar `Sin fecha definida` hasta que se registre una fecha real.

## 3. Contrato vigente

### Suscripcion activa con vencimiento

```json
{
  "data": {
    "account_id": 25,
    "status": "active",
    "plan": {
      "id": "enterprise",
      "name": "Enterprise"
    },
    "current_period_end": "2026-10-01T00:00:00.000Z",
    "cancel_at_period_end": false,
    "access_allowed": true,
    "is_expired": false,
    "days_remaining": 28,
    "entitlements": {
      "ct": true,
      "billing": true
    },
    "limits": {
      "providers": 20
    }
  }
}
```

### Suscripcion vencida

```json
{
  "data": {
    "account_id": 25,
    "status": "expired",
    "plan": null,
    "current_period_end": "2026-09-02T00:00:00.000Z",
    "cancel_at_period_end": false,
    "access_allowed": false,
    "is_expired": true,
    "days_remaining": 0,
    "entitlements": {},
    "limits": {}
  }
}
```

### Suscripcion sin fecha definida

```json
{
  "data": {
    "status": "active",
    "current_period_end": null,
    "access_allowed": true,
    "is_expired": false,
    "days_remaining": null,
    "entitlements": {
      "ct": true
    },
    "limits": {}
  }
}
```

`current_period_end: null` no debe convertirse a una fecha inventada. Representa una suscripcion sin fecha de caducidad configurada.

## 4. Adaptador recomendado en frontend

Centralizar la compatibilidad en un solo adaptador evita que cada modulo interprete la respuesta de forma distinta:

```js
export function normalizeSubscription(payload) {
  const subscription = payload?.data || payload || {};
  const status = subscription.status || 'expired';
  const entitlements = subscription.entitlements || {};
  const limits = subscription.limits || {};
  const hasKnownEndDate = Boolean(subscription.current_period_end);
  const calculatedExpired = hasKnownEndDate
    ? new Date(subscription.current_period_end).getTime() <= Date.now()
    : false;

  return {
    ...subscription,
    status,
    entitlements,
    limits,
    is_expired: subscription.is_expired === true || calculatedExpired,
    access_allowed: subscription.access_allowed === undefined
      ? ['active', 'trialing'].includes(status) && !calculatedExpired
      : subscription.access_allowed === true && !calculatedExpired,
    days_remaining: subscription.days_remaining ?? null
  };
}
```

El adaptador permite consumir respuestas antiguas que no tengan los campos nuevos, pero no debe conceder acceso si la fecha existente ya vencio.

## 5. Guarda de modulos

Usar una sola funcion para toda la navegacion y para los menus:

```js
export function canUseModule(subscription, featureKey) {
  const current = normalizeSubscription(subscription);
  return current.access_allowed === true
    && current.entitlements?.[featureKey] === true;
}
```

Ejemplo:

```js
const visibleModules = modules.filter(module =>
  canUseModule(subscription, module.featureKey)
);
```

No usar solamente el nombre del plan, `account_id`, `proveedor_id` ni un valor enviado desde el navegador para decidir acceso.

El backend mantiene una segunda validacion. Si un usuario entra directamente a una URL protegida, debe recibir `403 SUBSCRIPTION_REQUIRED` cuando el modulo no esta contratado o la suscripcion ya no esta vigente.

## 6. Mensajes para el usuario

El mensaje debe derivarse del estado normalizado:

```js
export function getSubscriptionMessage(subscription) {
  const current = normalizeSubscription(subscription);

  if (current.is_expired) {
    return 'Tu suscripcion ha vencido. Renuevala para continuar usando los modulos.';
  }

  if (current.days_remaining !== null) {
    if (current.days_remaining === 0) return 'Tu suscripcion vence hoy.';
    if (current.days_remaining === 1) return 'Te queda 1 dia de suscripcion.';
    return `Te quedan ${current.days_remaining} dias de suscripcion.`;
  }

  if (!current.current_period_end && current.access_allowed) {
    return 'Tu suscripcion esta activa, pero no tiene fecha de vencimiento definida.';
  }

  return '';
}
```

Representacion sugerida:

```jsx
<p>{getSubscriptionMessage(subscription)}</p>
```

No mostrar `Sin limites definidos` como error. `limits: {}` puede significar que el plan no tiene limites configurados. Para cada limite se debe distinguir:

```js
const hasLimit = Object.prototype.hasOwnProperty.call(subscription.limits || {}, limitKey);
const label = hasLimit ? subscription.limits[limitKey] : 'Sin limite definido';
```

## 7. Refresco y contador

Consultar la suscripcion al iniciar sesion y al cargar el layout principal:

```js
const response = await fetch(`${apiUrl}/suscripciones/account/subscription`, {
  credentials: 'include',
  headers: { Accept: 'application/json' }
});

const subscription = normalizeSubscription(await response.json());
```

`days_remaining` sirve para una vista rapida, pero el contador visual debe calcularse desde `current_period_end` para no quedar congelado durante la cache de 120 segundos:

```js
export function getDaysRemaining(currentPeriodEnd) {
  if (!currentPeriodEnd) return null;
  const milliseconds = new Date(currentPeriodEnd).getTime() - Date.now();
  if (Number.isNaN(milliseconds)) return 0;
  return Math.max(0, Math.ceil(milliseconds / 86400000));
}
```

Se recomienda actualizar la pantalla al volver al foco de la ventana y despues de renovar o modificar la suscripcion:

```http
POST /suscripciones/account/subscription/refresh
```

## 8. Tabla de decisiones

| Estado | Fecha | `access_allowed` | Modulos | Mensaje |
|---|---|---:|---|---|
| `active` | Futura | `true` | Mostrar entitlements activos | Dias restantes |
| `trialing` | Futura | `true` | Mostrar entitlements activos | Dias restantes de prueba |
| `active` | `null` | `true` | Mostrar entitlements activos | Fecha no definida |
| `active` | Pasada | `false` | Ocultar o bloquear | Suscripcion vencida |
| `trialing` | Pasada | `false` | Ocultar o bloquear | Prueba vencida |
| `canceled` | Cualquiera | `false` | Ocultar o bloquear | Suscripcion cancelada |
| `past_due` | Cualquiera | `false` | Ocultar o bloquear | Pago pendiente |
| Sin cuenta | `null` | `false` | Ocultar o bloquear | No hay suscripcion activa |

## 9. Checklist de actualizacion

- Leer siempre `response.data`.
- Normalizar la respuesta en un unico punto.
- Usar `access_allowed` y `entitlements[featureKey]` para mostrar modulos.
- Usar `current_period_end` para el contador exacto.
- Usar `days_remaining` para el mensaje inicial.
- Mostrar un mensaje para `expired`, `canceled`, `past_due` y `suspended`.
- Tratar `current_period_end: null` como fecha no configurada, no como fecha futura.
- Tratar `limits: {}` como ausencia de limite configurado, no como fallo de API.
- Ejecutar `POST /suscripciones/account/subscription/refresh` despues de renovar.
- No asumir que ocultar el modulo reemplaza la validacion del backend.

## 10. Diagnostico si los modulos siguen sin aparecer

1. Inspeccionar la respuesta de `GET /suscripciones/account/subscription`.
2. Confirmar que el frontend usa `body.data`, no el objeto `body` completo.
3. Revisar `status`, `access_allowed`, `is_expired` y `current_period_end`.
4. Confirmar que el `featureKey` coincide exactamente con el entitlement, por ejemplo `ct`, `billing` o `products`.
5. Si `current_period_end` esta vencido, renovar la suscripcion con una fecha futura.
6. Si la fecha es `null`, registrar `current_period_end` al crear o actualizar la suscripcion.
7. Si la respuesta contiene entitlements pero el modulo no aparece, corregir la guarda frontend para que acepte `active` y `trialing` y consulte la clave correcta.

## Conclusion

La ruta [subscription.routes.js](suscripciones/subscription.routes.js) ya entrega la proyeccion mediante `toSubscriptionResponse`. No es necesario crear otra ruta para mostrar el tiempo restante. La compatibilidad se resuelve actualizando el frontend para consumir `data.access_allowed`, `data.current_period_end`, `data.days_remaining` y `data.entitlements` mediante un adaptador comun.

La causa de `Sin fecha definida` es que la suscripcion almacenada tiene `current_period_end = NULL`. Para mostrar tiempo restante real, la alta o renovacion debe enviar una fecha de finalizacion valida.
