# Propuesta de modelo de negocio para el módulo CT

## 1. Resumen ejecutivo

El módulo CT, expuesto en el menú como **Órdenes**, **Manager**, **Métricas** y **Cron**, debe comercializarse como una capacidad SaaS B2B de operación y orquestación de pedidos, complementaria a una tienda eCommerce en WordPress/WooCommerce.

La propuesta más apropiada es un modelo **B2B SaaS por cuenta o empresa**, con cobro recurrente mensual o anual, límites operativos explícitos y complementos de uso. La cuenta contratante representa a la empresa; sus usuarios, proveedores y tiendas son recursos asociados a esa cuenta. No se recomienda cobrar inicialmente por cada usuario ni depender exclusivamente de una comisión sobre las ventas.

La razón es que CT genera valor aunque no exista una venta individual: automatiza procesos, centraliza órdenes, sincroniza información, ofrece trazabilidad y permite medir la operación. Una comisión por transacción puede añadirse como componente variable cuando el volumen de pedidos sea alto, pero no debe ser la única fuente de ingresos.

## 2. Qué producto se está vendiendo

### 2.1 Funciones observables

| Superficie CT | Valor de negocio |
|---|---|
| Órdenes | Consulta, seguimiento y operación del ciclo de pedidos. |
| Manager | Gestión de productos, operaciones o procesos relacionados con CT. |
| Métricas | Visibilidad del volumen, estados, rendimiento y excepciones operativas. |
| Cron | Ejecución programada de sincronizaciones, tareas y procesos automáticos. |

Estas funciones se integran con el resto de la plataforma: catálogo de productos, proveedores, fulfillment, envíos, facturación, usuarios B2B y WooCommerce.

### 2.2 Posicionamiento recomendado

> **CT es el centro operativo B2B que conecta la tienda WooCommerce con proveedores, inventario, pedidos, procesos automáticos y métricas de cumplimiento.**

No debe posicionarse como un simple plugin de WordPress. WordPress es el canal de venta y presentación; CT es el sistema operativo de la operación comercial.

## 3. Modelo de negocio recomendado

### 3.1 Unidad de cobro: cuenta o empresa

La suscripción debe pertenecer a una `saas_account` o empresa contratante, no a un usuario individual. La cuenta puede agrupar:

- usuarios y roles;
- uno o varios proveedores;
- una o varias tiendas WooCommerce;
- conexiones externas;
- límites de operación;
- entitlements del plan;
- historial de suscripciones y auditoría.

Esto coincide con la arquitectura existente de suscripciones, donde los módulos se resuelven mediante `saas_plan_entitlements` y la cuenta recibe la proyección efectiva de acceso.

### 3.2 Fuentes de ingresos

Se recomienda combinar cuatro fuentes:

1. **Cuota fija recurrente:** acceso al plan CT y sus funciones incluidas.
2. **Cargo anual:** descuento frente al pago mensual y mayor retención.
3. **Add-ons:** proveedores, tiendas, automatizaciones, volumen adicional, soporte o analítica avanzada.
4. **Componente variable opcional:** cargo por pedido procesado por encima del límite incluido o porcentaje reducido en cuentas de alto volumen.

La cuota fija protege los ingresos cuando el volumen baja. Los límites y add-ons permiten capturar valor de clientes con mayor complejidad sin obligar a todos a contratar el plan más caro.

### 3.3 Lo que no se recomienda

- Un plan único sin límites: dificulta controlar costos de infraestructura.
- Cobrar solamente por usuario: no refleja el valor operativo y penaliza la colaboración.
- Cobrar solamente comisión por venta: hace incierto el ingreso y mezcla el precio del software con el margen comercial.
- Habilitar módulos por el pago de Stripe sin validar entitlements: el acceso debe depender de `access_allowed` y de la funcionalidad habilitada en el plan.
- Vender CT como funcionalidad aislada sin aclarar la dependencia de WooCommerce, proveedores y conexiones.

## 4. Tipos de suscripción recomendados

### 4.1 Prueba gratuita

**Objetivo:** reducir fricción comercial y permitir validar la integración.

- Duración sugerida: 14 días.
- Una cuenta por empresa y dominio, sujeta a validación.
- Sin obligación de pago durante la prueba.
- Límite bajo de órdenes y conexiones.
- Acceso a métricas básicas.
- Sin procesos masivos ni soporte prioritario.
- Requiere tarjeta solo si el negocio acepta conversión automática al finalizar; de lo contrario, solicitar activación explícita.

Estado técnico sugerido: `trialing` con fecha de finalización obligatoria.

### 4.2 Mensual

**Objetivo:** opción de entrada para pequeñas empresas y clientes que aún están validando el canal.

- Renovación automática cada mes.
- Precio más alto que el equivalente mensual del plan anual.
- Límites definidos por órdenes, proveedores, tiendas y ejecuciones automáticas.
- Cancelación al final del periodo, conservando acceso hasta la fecha de vencimiento.

### 4.3 Anual

**Objetivo:** mejorar retención, flujo de caja y previsibilidad.

- Cobro anual anticipado.
- Descuento sugerido de 15% a 20% contra doce mensualidades.
- Mismos módulos que la modalidad mensual equivalente.
- Puede incluir onboarding o una cantidad mayor de órdenes como incentivo.

El intervalo de cobro no debe activar módulos por sí mismo; mensual y anual deben compartir la misma configuración de entitlements salvo que exista una decisión comercial explícita.

### 4.4 Enterprise o contrato personalizado

**Objetivo:** atender distribuidores, operadores y empresas con varios proveedores o tiendas.

- Precio negociado.
- Límites personalizados o capacidad contratada.
- SLA y soporte prioritario.
- Integraciones especiales.
- Ambiente de pruebas, onboarding técnico y migración.
- Facturación anual o contrato plurianual.
- Posibilidad de SSO, auditoría avanzada, webhooks y roles personalizados.

Debe mantenerse como una suscripción por cuenta, con overrides de entitlements y límites auditables.

### 4.5 Suscripción suspendida o morosa

No es un plan comercial, sino un estado de ciclo de vida. Se debe distinguir entre:

- `past_due`: pago pendiente; permitir únicamente una pantalla de recuperación y funciones estrictamente necesarias para regularizar.
- `canceled`: cancelación solicitada o ejecutada; acceso hasta el fin del periodo si `cancel_at_period_end` está activo.
- `expired`: periodo terminado; bloquear CT y conservar acceso a recuperación, exportación limitada o consulta según política.
- `suspended`: bloqueo administrativo o incumplimiento contractual.

Los estados que no conceden acceso no deben conservar entitlements efectivos en la respuesta del backend.

## 5. Catálogo de planes propuesto

Los precios siguientes son una estructura de referencia para validar con costos, mercado y margen; no son precios definitivos.

| Plan | Cliente objetivo | CT | Proveedores | Tiendas WooCommerce | Órdenes incluidas/mes | Automatizaciones |
|---|---|---:|---:|---:|---:|---:|
| **CT Inicial** | Empresa pequeña que prueba operación B2B | Órdenes, Manager básico, Métricas básicas | 1 | 1 | 250 | 5 tareas |
| **CT Crecimiento** | Distribuidor en operación recurrente | CT completo | 3 | 2 | 2,000 | 25 tareas |
| **CT Profesional** | Operador multi-proveedor | CT completo, métricas avanzadas, prioridad operativa | 10 | 5 | 10,000 | 100 tareas |
| **CT Enterprise** | Red de proveedores o alto volumen | CT completo y capacidades personalizadas | Personalizado | Personalizado | Personalizado | Personalizado |

La tabla debe convertirse en configuración de backend, no en reglas hardcodeadas del frontend. Por ejemplo:

```json
{
  "ct": {
    "enabled": true,
    "limits": {
      "orders_monthly": 2000,
      "providers": 3,
      "stores": 2,
      "cron_jobs": 25,
      "retention_days": 90
    }
  }
}
```

## 6. Add-ons y cobro por exceso

### 6.1 Add-ons recomendados

- Proveedor adicional.
- Tienda WooCommerce adicional.
- Paquete de órdenes mensuales.
- Automatizaciones o ejecuciones Cron adicionales.
- Retención histórica y auditoría extendida.
- Métricas avanzadas y exportaciones programadas.
- Onboarding y migración de catálogo.
- Soporte con SLA.
- Integración especial con un proveedor o ERP.

### 6.2 Política de exceso

Debe elegirse una sola política por límite y comunicarla claramente:

- **Bloqueo preventivo:** no aceptar nuevas órdenes al alcanzar el límite.
- **Overage automático:** permitir operación y cobrar paquetes adicionales.
- **Upgrade guiado:** pausar la operación y ofrecer cambio de plan.

Para órdenes, la opción más sana suele ser alertar al 80% y 100%, permitir un pequeño margen configurable y solicitar upgrade antes de bloquear una operación crítica. Para procesos Cron, conviene limitar ejecuciones para proteger infraestructura.

## 7. Relación con la tienda WordPress/WooCommerce

### 7.1 Separación de responsabilidades

**WordPress/WooCommerce:**

- escaparate y contenido;
- carrito y experiencia de compra, si aplica;
- captura inicial del pedido;
- plugins de pago y presentación;
- SEO y marketing.

**CT:**

- normalización y orquestación de órdenes;
- asignación por proveedor y fulfillment;
- sincronización de productos, precios y stock;
- tareas automáticas;
- métricas operativas;
- trazabilidad, reintentos y excepciones;
- operación B2B y administración interna.

### 7.2 Regla comercial importante

La suscripción CT debe cobrarse a la empresa que obtiene el beneficio operativo. La venta de productos en WooCommerce se mantiene separada:

- el cliente puede pagar el software aunque venda poco durante un periodo;
- el precio del producto, envío, impuestos y margen no se confunden con la cuota SaaS;
- si se usa una comisión por pedido, debe mostrarse como cargo separado y tener reglas de liquidación claras.

### 7.3 Integración mínima necesaria

Para que el producto sea vendible, la integración debe soportar al menos:

1. identificación de la cuenta CT y la tienda;
2. autenticación segura entre WooCommerce y CT;
3. alta idempotente de pedidos;
4. sincronización de estados;
5. sincronización de stock y precios con marca de tiempo;
6. reintentos y registro de errores;
7. webhooks o polling controlado;
8. desconexión y revocación de credenciales;
9. aislamiento por cuenta, proveedor y tienda.

## 8. Entitlements y control de acceso

La fuente de autorización debe ser el backend:

```text
saas_accounts
  -> saas_subscriptions
  -> saas_plans
  -> saas_plan_entitlements
  -> account entitlement overrides
```

Para CT, el frontend debe comprobar la proyección de suscripción y usar la clave `ct`. El acceso requiere simultáneamente:

- estado `active` o `trialing`;
- `access_allowed = true`;
- fecha de periodo válida y no vencida;
- entitlement `ct` habilitado;
- rol o permiso del usuario para la operación concreta.

El entitlement `ct` habilita el módulo, pero no debe convertir automáticamente a todos los usuarios en administradores. Las acciones de órdenes, Manager, métricas y Cron deben tener permisos diferenciados.

Se recomienda separar, cuando el producto madure, claves como:

```text
ct
ct.orders.read
ct.orders.manage
ct.manager
ct.metrics
ct.cron
ct.export
```

Durante una primera versión puede mantenerse `ct` como entitlement de paquete y controlar las acciones mediante permisos internos.

## 9. Métricas de negocio que deben medirse

### Producto

- activación de una cuenta después del alta;
- tiempo hasta la primera orden procesada;
- conexión WooCommerce completada;
- porcentaje de sincronizaciones exitosas;
- errores de Cron por cuenta;
- uso de órdenes frente al límite contratado;
- adopción de Manager y Métricas.

### Negocio

- conversión de prueba a pago;
- ingreso recurrente mensual y anual;
- churn de cuentas;
- expansión por add-ons y upgrades;
- costo de infraestructura por cuenta;
- margen bruto del módulo CT;
- tiempo y costo de onboarding;
- tickets por integración.

### Operación

- pedidos procesados por hora;
- tiempo desde WooCommerce hasta CT;
- porcentaje de órdenes duplicadas o rechazadas;
- tiempo de resolución de excepciones;
- cumplimiento de SLA;
- disponibilidad de los procesos automáticos.

## 10. Reglas de facturación y ciclo de vida

1. Crear o resolver la cuenta antes de crear la suscripción.
2. Validar que el plan esté activo.
3. Registrar precio, moneda, intervalo y proveedor de pago.
4. Activar la suscripción únicamente después de confirmación del pago o del periodo de prueba.
5. Procesar webhooks de Stripe de forma idempotente.
6. Guardar `external_customer_id` y `external_subscription_id`.
7. Invalidar la caché de entitlements después de cualquier cambio.
8. Mantener historial y auditoría de altas, cambios, cancelaciones y overrides.
9. No borrar físicamente el historial de suscripciones.
10. Definir qué ocurre con pedidos, datos y exportaciones después de la expiración.

## 11. Recomendación de lanzamiento

### Fase 1: producto vendible

- CT Inicial y CT Crecimiento.
- Modalidad mensual y anual.
- Prueba de 14 días.
- Entitlement único `ct`.
- Límites de órdenes, proveedores, tiendas y Cron.
- Integración WooCommerce con webhooks, reintentos y logs.
- Stripe para cobro recurrente.
- Pantalla de uso y aviso al 80% del límite.

### Fase 2: monetización avanzada

- CT Profesional.
- Add-ons de órdenes, proveedores y tiendas.
- Métricas de uso para facturación.
- Overage o upgrades automáticos.
- Retención de datos por plan.
- Permisos internos más granulares.

### Fase 3: Enterprise

- Contratos personalizados.
- SLA, SSO, auditoría avanzada y onboarding.
- Integraciones privadas.
- Multiempresa o multi-tienda avanzado.
- Facturación consolidada y precios negociados.

## 12. Riesgos y decisiones pendientes

Antes de publicar precios se deben confirmar:

- costo mensual de infraestructura por cuenta;
- volumen promedio y máximo de órdenes;
- si CT procesa pedidos propios, de terceros o de proveedores;
- quién asume costos de WooCommerce, soporte y reintentos;
- definición exacta de una orden facturable;
- política de datos después de cancelar;
- SLA ofrecido por plan;
- responsabilidad ante stock incorrecto, pedidos duplicados o fallas de proveedor;
- impuestos, moneda y requisitos de facturación aplicables;
- si las métricas visibles son suficientes para justificar planes superiores;
- capacidad real del backend para medir y hacer cumplir cada límite.

## 13. Conclusión

El modelo óptimo es **SaaS B2B por empresa, con CT como centro operativo y WooCommerce como canal eCommerce**. La estructura comercial debe combinar cuota recurrente, descuentos por anualidad, límites por uso y add-ons. La prueba gratuita facilita la adopción; los planes Inicial, Crecimiento y Profesional cubren la progresión natural; Enterprise atiende integraciones y volúmenes especiales.

El principio rector debe ser separar tres cosas: **suscripción del software**, **venta de productos** y **costos variables de operación**. Esa separación hace más predecible el ingreso, permite configurar entitlements de forma segura y evita que el negocio dependa exclusivamente del margen o del número de transacciones.
