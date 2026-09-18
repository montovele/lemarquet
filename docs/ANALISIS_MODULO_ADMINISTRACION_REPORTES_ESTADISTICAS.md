# Módulo de administración: reportes y estadísticas

## 1. Objetivo

Construir un módulo administrativo profesional para que los perfiles autorizados puedan consultar el estado operativo de la plataforma, analizar órdenes y facturación, revisar clientes B2B y suscripciones, y exportar reportes reproducibles.

El primer alcance debe reutilizar los endpoints que ya consume el frontend. No se deben inventar métricas calculadas desde datos parciales ni exponer información sensible. Las métricas que no tengan contrato backend deben quedar señaladas como una ampliación posterior.

## 2. Usuarios y permisos

- `admin`: acceso completo a reportes operativos, CT, facturación, usuarios/conexiones B2B y suscripciones.
- `operador`: acceso a reportes operativos, órdenes, proveedores y métricas permitidas; sin administración de usuarios, suscripciones ni configuración sensible.
- `owner`: conservar el flujo actual de órdenes; no habilitar el módulo hasta que exista un permiso explícito.
- `proveedor`: no debe acceder al panel global. Sus reportes deben limitarse a sus propios datos mediante endpoints con alcance por proveedor.

La ruta debe protegerse con autenticación y rol. Además de la navegación, cada acción de carga y exportación debe respetar permisos en la UI y en backend.

## 3. Fuentes existentes y capacidades

### 3.1 Dashboard operativo global

Store actual: `src/stores/useDashboardStore.js`.

| Endpoint | Uso recomendado |
|---|---|
| `GET /dashboard/status-proveedores` | Estado y distribución de proveedores |
| `GET /dashboard/metrics-resumen` | Tarjetas KPI operativas |
| `GET /dashboard/actividad-reciente` | Línea de actividad y eventos recientes |
| `GET /dashboard/top-proveedores` | Ranking de proveedores |
| `POST /cron/estado` | Acción operativa existente; no es una métrica |

Limitación: estos endpoints no documentan filtros de período. El panel debe indicar el período que realmente devuelve el backend y no simular comparativos.

### 3.2 Dashboard CT

Store actual: `src/stores/useDashboardCtStore.js`.

| Endpoint | Uso recomendado |
|---|---|
| `GET /ct/dashboard/ct` | Resumen de órdenes, pendientes y tiempos |
| `GET /ct/dashboard/ct/graficas` | Distribución por estado |
| `GET /ct/dashboard/ct/series/diaria?dias=30` | Serie diaria de órdenes e ingresos |
| `GET /ct/dashboard/ct/forecast/mensual?meses=3` | Histórico y proyección mensual |
| `GET /ct/dashboard/ct/comparativo-mes` | Comparativo MoM |
| `GET /ct/dashboard/ct/wow` | Comparativo WoW |
| `GET /ct/dashboard/ct/yoy` | Comparativo YoY |
| `GET /ct/dashboard/ct/heatmap` | Concentración de órdenes por día y hora |

El store ya normaliza nombres de estado, valores numéricos, series, variaciones y heatmap. El nuevo módulo debe reutilizar ese store o extraer sus normalizadores a utilidades compartidas, no duplicar transformaciones en cada componente.

### 3.3 Facturación

API actual: `src/components/facturas/api/dashboard.api.js`, base `/facturas/admin/dashboard/facturacion`.

| Endpoint | Uso recomendado |
|---|---|
| `GET /facturas/admin/dashboard/facturacion` | Resumen general de facturación |
| `GET /facturas/admin/dashboard/facturacion/metricas` | KPI fiscales y de emisión |
| `GET /facturas/admin/dashboard/facturacion/recientes?limit=10` | Tabla de facturas recientes |
| `GET /facturas/admin/dashboard/facturacion/estatus` | Distribución por estatus |
| `GET /facturas/admin/dashboard/facturacion/ventas?anio=YYYY` | Ventas mensuales |
| `GET /facturas/admin/dashboard/facturacion/top-clientes?limit=10` | Ranking de clientes |
| `GET /facturas/admin/dashboard/facturacion/errores?limit=20` | Incidencias de facturación |
| `GET /facturas/admin/dashboard/facturacion/sat` | Métricas SAT |
| `GET /facturas/admin/dashboard/facturacion/timbrado-diario?fechaInicio=&fechaFin=` | Serie de timbrado |

La API usa `httpClient` y un resolvedor compatible con respuestas envueltas en `data`. El módulo debe conservar esa normalización.

### 3.4 Usuarios, conexiones y B2B

Servicio actual: `src/services/managedUsers.service.js`.

| Endpoint | Uso recomendado |
|---|---|
| `GET /api/managed-users?source=all` | Universo de usuarios B2B; distinguir `sql` y `legacy` |
| `GET /api/managed-users/:id?source=sql` | Detalle de usuario |
| `GET /api/managed-connections` | Inventario y estado de conexiones |
| `GET /api/managed-connections/:id` | Detalle de conexión |
| `GET /ecommerce/admin/ecommerce/connection-templates` | Catálogo de plantillas |
| `GET /ct/b2b/customer` | Clientes B2B |
| `GET /ct/b2b/price-tiers` | Segmentos o niveles de precio |
| `GET /b2b/health` | Salud del servicio B2B |

No utilizar `id` sin conservar `source` cuando el registro proceda de `managed-users`: SQL y legacy son almacenes distintos.

### 3.5 Suscripciones SaaS

La vista administrativa existente consume:

- `GET /suscripciones/admin/saas/subscriptions`
- `GET /suscripciones/admin/saas/plans`
- `POST /suscripciones/admin/saas/users/:userId/account`
- `GET /suscripciones/admin/saas/subscriptions/:subscriptionId/entitlements`

Estos endpoints sirven para un reporte de cartera, planes, vigencia y acceso. No asumir ingresos recurrentes, churn o MRR si la respuesta no los entrega.

## 4. Experiencia propuesta

### Ruta y navegación

Agregar una ruta protegida, por ejemplo `/admin/reports`, dentro del área administrativa. El módulo debe presentar una navegación interna por pestañas:

1. **Resumen**: KPIs operativos, CT y facturación.
2. **Órdenes y CT**: serie diaria, estados, MoM/WoW/YoY, forecast y heatmap.
3. **Facturación**: ventas, estatus, timbrado, SAT, errores y top clientes.
4. **Clientes y proveedores**: usuarios B2B, conexiones, proveedores y price tiers.
5. **Suscripciones**: planes, estado, vigencia, entitlements y cuentas.

### Controles

- Selector de período solo donde el endpoint lo soporte.
- Selector de año para ventas mensuales.
- Límites configurables para rankings y tablas.
- Botón de recarga por sección y estado de última actualización.
- Estados de carga independientes; una falla de facturación no debe ocultar CT.
- Estados vacíos y errores accionables.
- Exportación de los datos actualmente visibles a CSV desde el frontend como primera versión.
- Exportación PDF o XLSX consolidada solo cuando exista un contrato backend o una librería aprobada para ello.

### Visualización

Usar ECharts o Chart.js, ya presentes en `package.json`, y componentes existentes del dashboard cuando sean compatibles. Mantener una jerarquía sobria: tarjetas KPI para números, gráficos para tendencias y tablas para detalle. Los colores de estado deben tener texto o icono además del color.

## 5. Arquitectura frontend recomendada

```text
src/
  views/admin/AdminReportsView.vue
  components/admin/reports/
    ReportsToolbar.vue
    ReportsKpiGrid.vue
    OperationalReport.vue
    CtReport.vue
    BillingReport.vue
    CustomersReport.vue
    SubscriptionsReport.vue
    ReportTable.vue
  stores/useAdminReportsStore.js
  services/adminReports.service.js
  utils/reportFormatters.js
  router/routes/adminReports.js
```

### Store

`useAdminReportsStore` debe mantener estado por dominio:

- `operational`, `ct`, `billing`, `customers`, `subscriptions`
- `loadingBySection`
- `errorsBySection`
- `lastUpdatedBySection`
- filtros compatibles con cada endpoint

Usar `Promise.allSettled` para carga paralela por sección. Exponer acciones pequeñas (`loadOperational`, `loadCt`, `loadBilling`, etc.) y una acción `loadAll` que no pierda resultados exitosos por un fallo aislado.

### Servicio

Centralizar las llamadas en `adminReports.service.js`. El servicio debe:

- usar el cliente HTTP existente de cada módulo;
- enviar `credentials: include` donde corresponda;
- normalizar wrappers `data`, sin ocultar errores HTTP;
- no registrar tokens, contraseñas, claves WooCommerce ni secretos;
- aceptar `AbortSignal` si el cliente actual lo permite;
- preservar parámetros explícitos y no enviar filtros vacíos.

## 6. Contratos pendientes de backend

Estas capacidades no deben fabricarse en frontend:

- reporte consolidado con rango `fechaInicio/fechaFin` común para todos los dominios;
- exportación asíncrona CSV/XLSX/PDF de grandes volúmenes;
- auditoría de quién consultó o exportó un reporte;
- MRR, ARR, churn, cohortes y conversión de suscripciones;
- ingresos netos, margen, impuestos y conciliación de pagos;
- filtros globales por proveedor, cliente, canal y estado;
- paginación y totales agregados para usuarios, conexiones y clientes;
- snapshots históricos para comparar valores que hoy solo se devuelven como estado actual.

Para cada ampliación, backend debe definir método, ruta, parámetros, permisos, forma de respuesta, paginación, zona horaria, moneda, precisión decimal y códigos de error.

## 7. Seguridad y calidad

- Aplicar mínimo privilegio y validar roles también en backend.
- Evitar mostrar o exportar campos sensibles de usuarios y conexiones.
- Formatear fechas con zona horaria explícita y moneda configurada.
- No mezclar métricas de fuentes con períodos o definiciones diferentes.
- Cancelar o ignorar respuestas obsoletas cuando el usuario cambie filtros rápidamente.
- Probar transformadores con respuestas vacías, `null`, wrappers `data` y errores HTTP.
- Probar la visibilidad por rol y el aislamiento de fallos por sección.
- Ejecutar `npm run build` y las pruebas relacionadas antes de integrar.

## 8. Entrega por fases

### Fase 1: MVP operativo

Ruta, layout, permisos, store, resumen operativo, CT y facturación con los endpoints existentes. Incluye recarga, estados de error y exportación CSV de tablas visibles.

### Fase 2: administración comercial

Usuarios/conexiones B2B, clientes, proveedores, price tiers y suscripciones. Añadir filtros y paginación solo cuando los contratos estén confirmados.

### Fase 3: reportes profesionales

Contratos backend de rango global, exportaciones asíncronas, auditoría, reportes guardados y métricas SaaS avanzadas.

## 9. Criterios de aceptación

- Un `admin` puede abrir `/admin/reports` y ver cada dominio de forma independiente.
- Un `operador` solo ve las secciones autorizadas y nunca las acciones administrativas.
- Un fallo en una API muestra error localizado y conserva las secciones exitosas.
- Los gráficos no muestran series inventadas cuando la respuesta está vacía.
- Las tablas muestran estado, paginación o límite real y fecha de actualización.
- No aparecen secretos en pantalla, consola ni archivos exportados.
- Las pruebas cubren normalización, permisos, carga parcial y exportación CSV.
- El build de Vite termina correctamente.
