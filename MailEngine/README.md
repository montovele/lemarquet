# MailEngine

Este código forma parte del repositorio principal de Lemarquet; ya no se administra como un repositorio Git independiente. El backend principal importa `services/SupportEmailService.js` para enviar los códigos de verificación del chat.

Para instalar dependencias, configurar SMTP e iniciar el proyecto, sigue las instrucciones de la [guía principal](../README.md) y de [Atención a clientes](../docs/ATENCION_CLIENTES.md). Usa el `.env` de la raíz del proyecto.

El resto de este documento describe el backend independiente de diagnósticos incluido en esta carpeta.

## Descripción

Backend moderno en Node.js para capturar diagnósticos empresariales, almacenarlos en MySQL, y notificar al equipo administrativo vía correo electrónico. El proyecto usa ES Modules, Express, JWT, validación de entrada y manejo de errores centralizado.

## Tecnologías principales

- Node.js 18+
- Express
- MySQL (`mysql2`)
- JSON Web Tokens (`jsonwebtoken`)
- Validación con `express-validator`
- Envío de emails con `nodemailer`
- Variables de entorno con `dotenv`

## Arquitectura

- `server.js`: inicializa el servidor, middleware global, rutas y manejo de errores.
- `routes/auth.routes.js`: endpoint de autenticación administrativa con JWT.
- `routes/diagnostico.routes.js`: endpoints de diagnóstico con validación de request.
- `controllers/DiagnosticoController.js`: lógica de negocio, normalización de payload y orquestación de persistencia/envío de email.
- `repositories/DiagnosticoRepository.js`: acceso a datos en MySQL.
- `services/db.js`: inicializa pool de MySQL y crea la base de datos/tabla si no existen.
- `services/EmailService.js`: construye la plantilla de correo e interactúa con el transportador SMTP.
- `middleware/auth.js`: valida token JWT en rutas protegidas.
- `agents/emailAgent.js`: encapsula notificaciones administrativas.

## Configuración

1. Instala dependencias:

```bash
npm install
```

2. Crea un archivo `.env` en la raíz con las variables necesarias.

3. Arranca el servidor:

```bash
npm start
```

## Variables de entorno

- `PORT` (opcional): puerto del servidor, por defecto `3010`
- `DB_HOST`: host de MySQL
- `DB_PORT`: puerto de MySQL
- `DB_USER`: usuario de MySQL
- `DB_PASS`: contraseña de MySQL
- `DB_NAME`: nombre de la base de datos
- `JWT_SECRET`: secreto para firmar tokens JWT
- `JWT_EXPIRES_IN`: tiempo de expiración del token JWT (por ejemplo `2h`)
- `ADMIN_EMAIL`: correo administrativo de acceso
- `ADMIN_PASSWORD`: contraseña del administrador
- `SMTP_HOST`: host SMTP
- `SMTP_PORT`: puerto SMTP
- `SMTP_SECURE`: `true` o `false`
- `SMTP_REQUIRE_TLS`: `true` o `false`
- `SMTP_IGNORE_TLS`: `true` o `false`
- `SMTP_USER`: usuario SMTP
- `SMTP_PASS`: contraseña SMTP
- `SMTP_FROM`: dirección remitente para los correos

## Endpoints

### Salud

- `GET /health`
  - Devuelve estado de la API.

### Autenticación

- `POST /auth/login`
  - Body:
    - `email`
    - `password`
  - Respuesta:
    - `token`
    - `expiresIn`
    - `user`

### Diagnósticos (protegido por JWT)

- `POST /diagnosticos`
  - Crea un nuevo diagnóstico.
  - Body validado:
    - `empresa` (obligatorio)
    - `correo` (email válido)
    - `objetivo` (obligatorio)
    - `privacy` (booleano opcional)

- `GET /diagnosticos`
  - Lista diagnósticos.
  - Query params opcionales:
    - `page`
    - `limit`
    - `q`

- `GET /diagnosticos/:id`
  - Obtiene un diagnóstico por su ID.

- `POST /diagnosticos/:id/send-email`
  - Reenvía el diagnóstico por correo a un destinatario.
  - Body:
    - `recipient` (email válido)

## Flujo de datos

1. El cliente se autentica con `POST /auth/login` para recibir un token JWT.
2. El cliente llama a `POST /diagnosticos` con el payload del diagnóstico.
3. El controlador normaliza los datos y los guarda en MySQL.
4. Se dispara una notificación administrativa por correo electrónico.
5. El usuario puede consultar o reenviar el diagnóstico con los endpoints protegidos.

## Persistencia

El servicio `services/db.js` crea la base de datos y la tabla `diagnosticos` automáticamente si no existen. La tabla incluye campos como:

- `id`
- `createdAt`
- `empresa`
- `contacto`
- `correo`
- `telefono`
- `ciudad`
- `estado`
- `giro`
- `tipo_empresa`
- `empleados`
- `sucursales`
- `antiguedad`
- `objetivo`
- `soluciones`
- `erp`
- `crm`
- `website`
- `ecommerce`
- `presupuesto`
- `fecha_inicio`
- `observaciones`
- `privacy`
- `status`

## Validación y seguridad

- `express-validator` valida entradas en rutas de diagnóstico.
- `JWT` protege las rutas de diagnóstico usando `Authorization: Bearer <token>`.
- Manejo de errores centralizado en `server.js`.

## Notas de evolución

- Ya está implementada la migración a MySQL con arquitectura de repositorio.
- El backend está preparado para escalar con más rutas, modelos y controles de acceso.
- Se recomienda añadir tests automáticos y documentación OpenAPI para producción.

## Ejecución local recomendada

1. Crea `.env` con los valores necesarios.
2. Ejecuta `npm install`.
3. Ejecuta `npm start`.
4. Usa `POST /auth/login` y luego `Authorization: Bearer <token>` en las demás llamadas.
