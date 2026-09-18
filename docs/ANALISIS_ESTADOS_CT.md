# Analisis tecnico de estados CT

## Alcance

Este documento describe la logica de estados utilizada por `CtOrdenActions.vue`, sus dependencias y las reglas recomendadas para mostrar acciones del flujo CT.

Archivo analizado:

- `src/components/ct/CtOrdenActions.vue`

Fuente complementaria:

- `src/stores/useCtStore.js`

## Fuentes de datos

La orden utiliza varias propiedades que representan dimensiones diferentes del proceso:

| Propiedad | Responsabilidad |
|---|---|
| `estado_local` | Estado de la orden dentro del sistema local. |
| `estado_ct` | Estado principal del ciclo de vida en CT. |
| `pedido_status` | Resultado de cotizacion o errores asociados al pedido. |
| `payment_status` | Estado del pago, por ejemplo `paid`. |
| `ct_folio` | Indica que existe una peticion registrada en CT. |
| `pendiente_ct` | Flag auxiliar enviado por algunas respuestas del backend. |

`estado_ct` debe ser la fuente principal para decidir en que etapa se encuentra una orden. `payment_status` y `pedido_status` deben utilizarse como condiciones de habilitacion, no como reemplazo del estado CT.

## Normalizacion

El componente normaliza los valores antes de compararlos:

```js
const normalizeStatus = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, '_')
```

Esto permite tratar como equivalentes valores como:

- `Pendiente`
- ` pendiente `
- `PENDIENTE`
- `pendiente-ct`

La normalizacion no corrige sinonimos. Por ejemplo, `cotizado`, `cotizada`, `quoted` y `success` siguen siendo valores diferentes. Es necesario definir un catalogo de valores permitido por contrato con el backend.

## Estados funcionales

### `pendiente_ct`

Representa una orden local candidata para iniciar la peticion CT.

Condiciones recomendadas para mostrar el boton de peticion:

```text
estado_ct = pendiente_ct
payment_status = paid
pedido_status = cotizada
ct_folio no existe
```

El boton no debe mostrarse si ya existe `ct_folio`, porque la peticion ya fue creada y se podria duplicar.

### `pendiente`

Representa una peticion CT ya creada que aun requiere acciones posteriores, como consultar, cotizar o confirmar.

Condiciones recomendadas:

```text
estado_ct = pendiente
ct_folio existe
```

En este estado se pueden mostrar:

- Status CT.
- Detalle CT.
- Cotizar guia, si aun no existe cotizacion.
- Confirmar en CT, solo cuando la cotizacion sea valida.

### `procesando`

La orden esta siendo procesada por CT. No debe permitir una nueva peticion, cotizacion ni confirmacion manual.

### `completado`, `confirmado`, `confirmada`, `confirmada_ct`, `finalizado`, `finalizada`

Son estados terminales o de cierre. Actualmente se agrupan en `isFinalizado`.

En estos estados pueden mostrarse:

- Proceso terminado.
- Precio final.
- Administrar guia.

Debe confirmarse con backend si todos estos valores son realmente equivalentes. Si representan hitos diferentes, cada boton debe tener su propia condicion.

### `error`

Representa un error del proceso CT. No debe mostrar botones operativos de peticion, cotizacion o confirmacion.

### `cancelado`

Representa una orden cancelada. Debe quedar sin acciones operativas CT, salvo consulta de historial o logs.

## Estados computados actuales

### `isLocal`

```js
const isLocal = computed(() => estadoLocal.value === 'local')
```

Controla el boton para enviar la orden desde Local. La comparacion es segura porque `estado_local` se normaliza previamente.

### `isReadyToRequest`

```js
const isReadyToRequest = computed(() =>
  !hasCtFolio.value &&
  estadoCt.value === 'pendiente_ct' &&
  paymentStatus.value === 'paid' &&
  isCotizado.value
)
```

Es la regla correcta para la peticion CT siempre que `pedido_status = cotizada` sea el valor oficial del backend.

La dependencia `isCotizado` debe declararse antes de `isReadyToRequest` para mantener el codigo legible y evitar errores si en el futuro el computed se evalua durante la inicializacion.

### `isPendingConfirmation`

```js
const isPendingConfirmation = computed(() =>
  hasCtFolio.value && estadoCt.value === 'pendiente'
)
```

Es la condicion central para una peticion ya creada y pendiente de confirmacion.

Actualmente controla correctamente:

- Status CT.
- Detalle CT.
- Cotizacion.
- Confirmacion CT.

### `isFinalizado`

```js
const isFinalizado = computed(() =>
  hasCtFolio.value && estadosFinalizadosCt.includes(estadoCt.value)
)
```

Agrupa varios estados terminales. Esta condicion no debe habilitar una nueva peticion ni una nueva confirmacion CT.

### `isConfirmableCt`

```js
const isConfirmableCt = computed(() =>
  isPendingConfirmation.value &&
  isCotizado.value &&
  !isFinalizado.value &&
  !isCtError.value
)
```

Representa una orden lista para confirmar en CT:

- Tiene folio.
- Esta en estado `pendiente`.
- Esta cotizada.
- No esta finalizada.
- No tiene error.

El chequeo `!isFinalizado` es redundante mientras `isPendingConfirmation` exija exactamente `estado_ct = pendiente`, pero puede conservarse como proteccion defensiva.

## Matriz de visibilidad recomendada

| Estado CT | Pago | Cotizacion | Folio | Peticion | Status / Detalle | Cotizar | Confirmar | Precio final | Proceso terminado |
|---|---|---|---|---|---|---|---|---|---|
| `pendiente_ct` | `paid` | No | No | No | No | No | No | No | No |
| `pendiente_ct` | `paid` | Si | No | Si | No | No | No | No | No |
| `pendiente` | Cualquiera | No | Si | No | Si | Si | No | No | No |
| `pendiente` | Cualquiera | Si | Si | No | Si | No | Si | No | No |
| `procesando` | Cualquiera | Cualquiera | Si | No | No | No | No | No | No |
| `error` | Cualquiera | Cualquiera | Si | No | No | No | No | No | No |
| `completado` | Cualquiera | Si | Si | No | No | No | No | Si | Si |
| `finalizado` | Cualquiera | Si | Si | No | No | No | No | Si | Si |

## Flujo esperado

```text
pendiente_ct + paid + cotizada
              |
              | Peticion CT
              v
pendiente + ct_folio
              |
              | Consultar detalle / cotizar
              v
pendiente + cotizada
              |
              | Confirmar CT
              v
procesando
              |
              v
completado / finalizado
```

## Riesgos actuales

### 1. Contrato inconsistente de cotizacion

El componente espera exactamente:

```js
pedido_status === 'cotizada'
```

Si el backend devuelve otro valor, el boton de peticion no aparecera aunque el pedido este correctamente cotizado.

### 2. Estados de error mezclados

Actualmente `isCtError` combina:

- `estado_ct = error`
- `pedido_status = error_tecnico`
- `pedido_status = error_cotizacion`
- `pedido_status = sin_almacen_comun`

Son fallos de naturaleza diferente. Se recomienda separarlos:

```js
const isCtProcessError = computed(() => estadoCt.value === 'error')
const isQuotationError = computed(() =>
  ['error_tecnico', 'error_cotizacion'].includes(pedidoStatus.value)
)
const isWarehouseError = computed(() =>
  pedidoStatus.value === 'sin_almacen_comun'
)
```

Posteriormente cada accion debe decidir que tipo de error bloquea su ejecucion.

### 3. Flags duplicados del store

En `useCtStore.js`, el flag administrativo `pendiente_ct` se calcula como:

```js
!orden.ct_folio || estadoCT === 'pendiente'
```

Esto no equivale estrictamente al estado `pendiente_ct`. Puede marcar como pendientes ordenes sin folio o ya pendientes de confirmacion.

Debe distinguirse entre:

```text
ready_to_request = estado_ct pendiente_ct y sin folio
pending_confirmation = estado_ct pendiente y con folio
```

### 4. Estados terminales agrupados

Precio final, proceso terminado y administrar guia dependen actualmente de `isFinalizado`. Si sus reglas de negocio son distintas, deben separarse en computeds independientes.

## Propuesta de reprogramacion

1. Definir un catalogo oficial de estados CT.
2. Mantener `estado_ct` como estado principal del proceso.
3. Usar `payment_status` como requisito de pago.
4. Usar `pedido_status` como requisito de cotizacion o indicador de error.
5. Usar `ct_folio` como proteccion contra peticiones duplicadas.
6. Separar estados del proceso de estados de cotizacion.
7. Crear computeds con nombres de capacidad de accion:

```js
const canRequestCt = computed(...)
const canViewCtStatus = computed(...)
const canViewCtDetail = computed(...)
const canQuoteCt = computed(...)
const canConfirmCt = computed(...)
const canViewFinalPrice = computed(...)
const canShowProcessFinished = computed(...)
```

8. Cubrir la matriz con pruebas para cada combinacion critica.

## Casos minimos de prueba

- `pendiente_ct` + `paid` + `cotizada` + sin folio: muestra peticion.
- `pendiente_ct` + `paid` + sin cotizacion: oculta peticion.
- `pendiente_ct` + `unpaid` + cotizada: oculta peticion.
- `pendiente` + folio + sin cotizacion: muestra status, detalle y cotizar.
- `pendiente` + folio + cotizada: muestra confirmar CT.
- `procesando`: oculta acciones operativas.
- `error`: oculta acciones operativas.
- `completado`: muestra precio final y proceso terminado.
- `finalizado`: no muestra peticion ni confirmacion.
- Estado con mayusculas, espacios o guiones: se normaliza correctamente.

## Conclusion

La logica debe tratar `estado_ct` como una maquina de estados y no como un conjunto independiente de condiciones visuales. La distincion critica es:

- `pendiente_ct`: orden candidata para solicitar CT.
- `pendiente`: peticion CT creada pendiente de confirmacion.
- `procesando`: CT esta ejecutando la confirmacion.
- `completado` o `finalizado`: proceso terminado.

La peticion CT solo debe habilitarse con pago confirmado, cotizacion confirmada y sin folio CT. Status y detalle CT solo deben estar disponibles mientras la orden se encuentre en `pendiente` con folio valido.
