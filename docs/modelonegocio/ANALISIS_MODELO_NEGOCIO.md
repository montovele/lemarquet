# Analisis del modelo de negocio

## 1. Resumen ejecutivo

El sistema implementa una plataforma de comercio mayorista B2B y operacion de cadena de suministro para trabajar con multiples proveedores. Su funcion central es conectar clientes empresariales con un catalogo de productos, condiciones comerciales y capacidades de surtido de proveedores, y llevar el pedido desde la seleccion hasta el pago, la preparacion, el envio, la facturacion y el seguimiento.

La plataforma tiene dos superficies principales:

- **Backoffice operativo:** administracion de usuarios, clientes, proveedores, conexiones, productos, atributos, ordenes, sincronizaciones, envios, facturacion y metricas.
- **Portal B2B:** catalogo, detalle de producto, favoritos, carrito, construccion de pedido, cotizacion/previsualizacion, checkout, credito, historial de ordenes y calendario.

La mejor descripcion del producto, basada en el comportamiento observable, es: **hub B2B multi-proveedor con integracion de catalogo, pedidos, fulfillment, pagos y facturacion**.

El backend no forma parte de este workspace. Por ello, este documento describe el contrato y las reglas que el frontend expresa; no certifica que todos los endpoints esten desplegados, que las validaciones se repitan en servidor ni que exista una politica comercial no representada en el codigo.

## 2. Evidencia y nivel de certeza

### Evidencia directa

Se considera evidencia directa la existencia de rutas, pantallas, stores, servicios API, estados o validaciones implementadas en el frontend. Las fuentes principales son:

- [src/router/index.js](../src/router/index.js)
- [src/components/ssaxxonB2B/router/b2b.routes.js](../src/components/ssaxxonB2B/router/b2b.routes.js)
- [src/components/ssaxxonB2B/components/commerce/router/commerceRoutes.js](../src/components/ssaxxonB2B/components/commerce/router/commerceRoutes.js)
- [src/components/ssaxxonB2B/services/b2b.api.js](../src/components/ssaxxonB2B/services/b2b.api.js)
- [src/components/facturas/routes/facturas.routes.js](../src/components/facturas/routes/facturas.routes.js)

### Inferencias

Es razonable inferir un modelo mayorista y de distribucion por la combinacion de `proveedor_id`, price tiers, stock, almacenes, credito, envio, CTOnline, WooCommerce y facturacion. Sin embargo, el frontend no permite confirmar por si solo:

- quien es el propietario legal del inventario;
- si la plataforma compra y revende, o solo intermedia pedidos;
- el margen o comision real;
- contratos, SLA, impuestos comerciales o politicas de devolucion;
- si WooCommerce es canal propio, canal de un cliente o integracion opcional.

## 3. Propuesta de valor observable

### Para clientes B2B

- Comprar productos mediante un portal autenticado y restringido.
- Consultar disponibilidad y datos normalizados del catalogo.
- Recibir precios asociados a un nivel comercial (`price_tier`).
- Crear pedidos por SKU, de forma manual o masiva mediante CSV.
- Consultar subtotal, IVA, envio y total antes de confirmar.
- Elegir pago con tarjeta o credito comercial.
- Repetir pedidos anteriores y consultar su historial.
- Programar o consultar eventos relacionados con instalacion o entrega.

### Para la operacion interna

- Centralizar multiples proveedores y sus conexiones tecnicas.
- Importar, mapear, validar y sincronizar catalogos y atributos.
- Detectar conflictos y revisar logs de procesos.
- Analizar si un pedido puede surtirse desde un almacen o requiere dividirse.
- Enviar, reenviar, cancelar, reasignar y monitorear ordenes.
- Exportar informacion operativa y consultar metricas.
- Gestionar facturacion CFDI y configuracion de PAC.

### Para proveedores

- Recibir ordenes asignadas a su `proveedor_id`.
- Consultar productos y estados de orden.
- Mantener una conexion tecnica y participar en los flujos CT/WooCommerce.
- Configurar la presentacion PDF de sus documentos.

## 4. Actores y responsabilidades

| Actor | Responsabilidad observable |
|---|---|
| Administrador | Control global de usuarios, clientes, proveedores, productos, integraciones, ordenes, facturacion y configuracion. |
| Operador | Seguimiento y operacion de ordenes, exportaciones, catalogo, importaciones y soporte operativo. |
| Proveedor | Gestiona o consulta la operacion de sus ordenes, productos y conexion. |
| Cliente B2B | Compra para una empresa, consulta su catalogo/precio, usa credito o tarjeta y revisa sus pedidos. |
| Usuario publico | Se registra, inicia sesion o envia una solicitud de acceso B2B. |
| CTOnline / WooCommerce | Sistemas externos para catalogo, precios, disponibilidad, ordenes y sincronizacion. |
| PAC / SAT | Ecosistema externo implicado en la emision, cancelacion y recuperacion de CFDI. |

La aplicacion deriva el acceso B2B de un usuario con rol `proveedor` y `b2b_enabled = true`; no parece existir un rol tecnico independiente plenamente consistente para `b2b`.

## 5. Flujo de negocio de extremo a extremo

### 5.1 Alta y habilitacion de un cliente B2B

1. El usuario se registra o un administrador lo crea.
2. Se relacionan usuario, cliente, customer, proveedor y conexion tecnica.
3. El administrador activa o desactiva por separado cliente, customer y conexion.
4. El cliente queda listo para operar cuando la identidad comercial y la conexion estan activas.
5. El portal B2B carga el customer asociado y valida que pertenezca al proveedor del usuario.

La gestion distingue fuentes SQL y legacy, lo que indica una migracion o convivencia de dos modelos de identidad. La evidencia se encuentra en [src/services/managedUsers.service.js](../src/services/managedUsers.service.js), [src/stores/useManagedUsersStore.js](../src/stores/useManagedUsersStore.js) y [src/views/admin/ManagedUsersView.vue](../src/views/admin/ManagedUsersView.vue).

### 5.2 Catalogo y preparacion del pedido

1. El cliente entra al catalogo B2B.
2. Busca productos y consulta detalle, marca, SKU del fabricante, categorias y stock.
3. Puede guardar favoritos, agregar al carrito o construir un pedido por SKU.
4. Puede cargar un CSV para pedidos masivos.
5. El sistema asocia el pedido a un proveedor y normaliza SKU, cantidades y precios.

Las rutas de comercio estan en [src/components/ssaxxonB2B/components/commerce/router/commerceRoutes.js](../src/components/ssaxxonB2B/components/commerce/router/commerceRoutes.js), y los servicios de producto en [src/components/ssaxxonB2B/services/products.api.js](../src/components/ssaxxonB2B/services/products.api.js).

### 5.3 Precio, disponibilidad y fulfillment

1. Se calcula el precio segun customer, proveedor y nivel comercial.
2. Se validan existencia y enriquecimiento de los productos.
3. Se envian coordenadas del cliente y productos al analizador de fulfillment.
4. El resultado puede ser:
   - `FULL`: un almacen puede cubrir el pedido;
   - `SPLIT`: el pedido requiere dividirse entre almacenes;
   - `NO_STOCK`: no hay existencia suficiente.
5. Se muestran advertencias y errores antes de confirmar.
6. Se calcula subtotal, IVA, envio y total.

La evidencia de reglas comerciales y de surtido esta en [src/components/ssaxxonB2B/stores/useOrderBuilderStore.js](../src/components/ssaxxonB2B/stores/useOrderBuilderStore.js), [src/components/ssaxxonB2B/stores/useOrderAnalyzerStore.js](../src/components/ssaxxonB2B/stores/useOrderAnalyzerStore.js) y [src/components/ssaxxonB2B/services/orderAnalyzer.api.js](../src/components/ssaxxonB2B/services/orderAnalyzer.api.js).

### 5.4 Confirmacion, pago y credito

1. El cliente previsualiza el pedido.
2. Se crea o confirma el pedido mediante el order builder.
3. Se selecciona tarjeta, credito u otro metodo soportado por la API.
4. Para tarjeta se utiliza Stripe PaymentIntent y Stripe Elements.
5. Para credito se valida el credito disponible y se ejecuta el pago contra saldo.
6. La orden pasa a una pantalla de exito, credito o checkout.
7. Una orden pendiente de pago se conserva en `localStorage` para poder recuperarla.

La evidencia esta en [src/components/ssaxxonB2B/services/b2b.api.js](../src/components/ssaxxonB2B/services/b2b.api.js), [src/components/ssaxxonB2B/composables/useStripeCheckout.js](../src/components/ssaxxonB2B/composables/useStripeCheckout.js) y [src/components/ssaxxonB2B/stores/useOrderBuilderStore.js](../src/components/ssaxxonB2B/stores/useOrderBuilderStore.js).

### 5.5 Operacion posterior del pedido

El backoffice permite consultar por proveedor, cliente, estado y fechas; ver detalle e historial; modificar estado; enviar o reenviar a proveedor; cancelar; reasignar y exportar. El proveedor ve principalmente la operacion correspondiente a su alcance.

Las superficies principales son [src/router/routes/ordenes_routes/orders.js](../src/router/routes/ordenes_routes/orders.js), [src/composables/use_ordenes/useOrders.js](../src/composables/use_ordenes/useOrders.js) y [src/views/ordenes/OrdenDetalleView.vue](../src/views/ordenes/OrdenDetalleView.vue).

### 5.6 Sincronizacion externa

El sistema sincroniza o prepara sincronizacion con CTOnline y WooCommerce para productos, precios, stock y ordenes. Los procesos largos informan progreso mediante SSE y registran estados, logs y errores.

Las rutas y estados CT se concentran en [src/router/routes/ct/ctRoute.js](../src/router/routes/ct/ctRoute.js), [src/stores/useCtStore.js](../src/stores/useCtStore.js) y [src/components/ssaxxonB2B/stores/useCtSyncStore.js](../src/components/ssaxxonB2B/stores/useCtSyncStore.js).

### 5.7 Envio e instalacion

Existe un modulo de envios y, en el portal B2B, un calendario con eventos de instalacion, cotizaciones y notas. Esto sugiere que el negocio puede incluir entrega coordinada y servicios de instalacion, aunque el frontend no permite determinar si la instalacion se cobra como concepto separado.

Evidencia: [src/router/routes/envio/envio.js](../src/router/routes/envio/envio.js), [src/components/ssaxxonB2B/stores/useCalendarStore.js](../src/components/ssaxxonB2B/stores/useCalendarStore.js) y [src/components/ssaxxonB2B/stores/useOrderBuilderStore.js](../src/components/ssaxxonB2B/stores/useOrderBuilderStore.js).

### 5.8 Facturacion

El modulo de facturacion contempla dashboard, facturas, generacion de CFDI, clientes fiscales, folios, reportes, cancelaciones y configuracion PAC. La facturacion parece ser un proceso posterior al pedido y depende de datos fiscales, conceptos, impuestos y validaciones externas.

Evidencia: [src/components/facturas/routes/facturas.routes.js](../src/components/facturas/routes/facturas.routes.js), [src/components/facturas/api/facturas.api.js](../src/components/facturas/api/facturas.api.js) y [src/components/facturas/api/pedidos.api.js](../src/components/facturas/api/pedidos.api.js).

## 6. Modulos funcionales

| Modulo | Funcion de negocio |
|---|---|
| Autenticacion | Sesion, registro, login, expiracion y redireccion por rol. |
| Usuarios B2B | Alta, edicion, activacion, relacion con customer/proveedor y conexiones. |
| Proveedores | Consulta, configuracion y segmentacion de la operacion por proveedor. |
| Productos | Catalogo, stock, SKU, importacion, exportacion y sincronizacion. |
| Atributos y schema | Mapeo, simulacion de variaciones, conflictos, historial y restauracion. |
| Comercio B2B | Catalogo, favoritos, carrito y checkout. |
| Order builder | Pedido por SKU, CSV, preview, commit y reorder. |
| Fulfillment | Seleccion de almacen, cobertura, split y advertencias de stock. |
| Ordenes | Seguimiento interno, estados, reenvio, cancelacion, reasignacion y exportacion. |
| CTOnline | Cotizacion, disponibilidad, envio y seguimiento de ordenes CT. |
| WooCommerce | Configuracion e intercambio de productos/ordenes con tiendas externas. |
| Envio/calendario | Seguimiento de envios y eventos de instalacion. |
| Facturacion | CFDI, clientes fiscales, folios, reportes, cancelaciones y PAC. |
| Observabilidad | Dashboards, logs, notificaciones, cron jobs y SSE. |

## 7. Entidades de negocio observables

### Entidades nucleares

- Usuario y sesion.
- Cliente comercial y customer.
- Proveedor.
- Conexion tecnica.
- Producto, variacion, SKU y categoria.
- Atributo, valor, schema y relacion producto-categoria.
- Pedido, linea de pedido, estado e historial.
- Almacen, disponibilidad y resultado de fulfillment.

### Entidades comerciales y financieras

- Price tier y descuento.
- Limite de credito y credito disponible.
- Metodo de pago y PaymentIntent.
- Envio y costo de envio.
- Cliente fiscal, factura CFDI, folio y configuracion PAC.
- Cotizacion guardada y evento de calendario/instalacion.

### Entidades tecnicas de control

- Importacion y sincronizacion.
- Log de proceso, log de atributos y log de mapeo.
- Conflicto de datos.
- Notificacion y evento SSE.
- Visibilidad de tablas y mapa de estructura del proveedor.

El SQL incluido en [src/stores/ssaxxon_central_db.sql](../src/stores/ssaxxon_central_db.sql) parece cubrir principalmente la parte central de usuarios, proveedores, conexiones, productos, atributos y sincronizaciones. Las entidades B2B, pagos y facturacion aparecen sobre todo en contratos frontend/API, no en ese esquema.

## 8. Reglas de negocio deducibles

- El alcance operativo se filtra por `proveedor_id`.
- El cliente B2B debe tener un customer activo para entrar al portal.
- El cliente no debe operar sobre un proveedor distinto al asignado.
- Un pedido necesita productos y cantidades normalizadas.
- El stock insuficiente o un error de enriquecimiento bloquea el checkout.
- El precio depende del customer y de un `price_tier`.
- El total considera subtotal, IVA y envio.
- El credito debe cubrir el importe requerido cuando se usa pago a credito.
- Las operaciones sensibles sobre ordenes estan reservadas a administrador u operador.
- La edicion de productos y la resolucion de conflictos son funciones administrativas.
- Los procesos largos requieren estado, progreso y manejo de error.
- Los procesos de importacion y sincronizacion necesitan trazabilidad mediante logs.
- Una orden pendiente de tarjeta puede rehidratarse desde almacenamiento local.

## 9. Permisos y segregacion

Los permisos de negocio estan declarados en [src/utils/permissions.js](../src/utils/permissions.js). El patron esperado es:

- **Admin:** control global y cambios de alto impacto.
- **Operador:** ejecucion diaria, consulta de metricas, exportacion y soporte de ordenes.
- **Proveedor:** consulta y operacion limitada sobre su propio contexto.
- **Cliente B2B:** compra, consulta de catalogo y seguimiento de sus pedidos.

Riesgos observables:

- El guard global aplica principalmente `meta.roles`, mientras las rutas de facturacion declaran `meta.permission`; no se ve en [src/router/index.js](../src/router/index.js) un enforcement global equivalente para esos permisos.
- Algunas rutas declaran `b2b` como rol aunque el acceso B2B se deriva de `proveedor` mas `b2b_enabled`.
- Hay rutas, stores y vistas duplicadas con sufijos `copy`, `old` o variantes de refactor, lo que puede producir comportamientos divergentes.

## 10. Modelo de ingresos: lo que se puede y no se puede afirmar

### Mecanismos comerciales soportados

- Venta de productos mediante pedido B2B.
- Precios diferenciados por `price_tier`.
- Pago inmediato con tarjeta.
- Pago con credito comercial y control de limite.
- Cobro o calculo de envio.
- Posible cotizacion/servicio de instalacion.
- Facturacion formal mediante CFDI.

### No evidenciado

No se encontraron pruebas suficientes de una suscripcion SaaS, comision explicita por transaccion, porcentaje de margen visible, cuota por proveedor, publicidad, marketplace con liquidacion automatica o cargo independiente por instalacion. La existencia de servicios llamados `margin` y de niveles de precio no basta para afirmar una politica de monetizacion concreta.

Por tanto, el modelo economico mas prudente es **comercio mayorista B2B con precios segmentados y credito**, potencialmente habilitado por una plataforma de integracion multi-proveedor. La forma exacta de captura de valor debe confirmarse con el backend, contratos y reglas financieras del negocio.

## 11. Integraciones y arquitectura de soporte

- **CTOnline:** disponibilidad, cotizacion, pedidos, estados, guias y sincronizacion.
- **WooCommerce:** configuraciones de tienda, productos, precios y ordenes.
- **Stripe:** PaymentIntent y confirmacion de pagos con tarjeta.
- **PAC/SAT:** emision y gestion de CFDI.
- **SSE:** progreso de importaciones, sincronizaciones, precios, ordenes y notificaciones.
- **Redis:** servicio declarado en [docker-compose.yml](../docker-compose.yml), probablemente usado por backend o jobs; este frontend no demuestra su uso directo.
- **Firebase:** existe configuracion en [firebase/firebase.js](../firebase/firebase.js), pero no se confirma un uso activo desde la entrada principal.

## 12. Riesgos y preguntas abiertas

1. **Fuente de verdad:** definir si el catalogo canonico es CTOnline, WooCommerce o la base central.
2. **Modelo de inventario:** aclarar quien posee el inventario y quien asume el riesgo de falta de stock.
3. **Liquidacion:** especificar como se paga al proveedor y como se calcula margen/comision.
4. **Seguridad:** duplicidad entre cookies de sesion y Bearer tokens; revisar enforcement real en backend.
5. **Permisos:** unificar roles y permisos de rutas, especialmente facturacion y B2B.
6. **Estados:** consolidar estados de pedido entre order builder, orden local, CTOnline, WooCommerce y Stripe.
7. **Idempotencia:** garantizar que commit, pago, reenvio y sincronizacion no dupliquen efectos.
8. **Privacidad:** revisar datos fiscales, coordenadas, clientes y logs enviados al navegador o almacenados localmente.
9. **Migracion:** retirar o aislar rutas legacy, copias y stores duplicados.
10. **Cobertura:** ampliar pruebas para checkout, credito, fulfillment, permisos, sincronizacion y facturacion.

## 13. Conclusion

El sistema no es un ecommerce B2C generalista. Es una plataforma operativa para abastecimiento y venta B2B, donde el valor principal esta en combinar:

1. un catalogo consolidado de proveedores;
2. condiciones comerciales por cliente;
3. construccion y validacion de pedidos;
4. asignacion inteligente de inventario;
5. integracion con canales y proveedores externos;
6. cobro con tarjeta o credito;
7. envio, seguimiento y facturacion.

La hipotesis de negocio mas consistente es una operacion mayorista/distribuidora con portal para clientes empresariales y backoffice de integracion. Para convertir esta hipotesis en una especificacion empresarial definitiva faltan el backend, las reglas de margen/liquidacion, los contratos con proveedores y la politica comercial formal.