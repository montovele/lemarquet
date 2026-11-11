# Atención a clientes y chat

## Funcionalidad

- El botón **Atención a clientes** de la página abre el panel de agentes en `/#/atencion`.
- Los agentes inician sesión con `ASSISTANCE_USERNAME` y `ASSISTANCE_PASSWORD`. Las conversaciones se pueden filtrar por estado y buscar por nombre, usuario o referencia; desde el panel se pueden responder y cambiar de estado.
- El chat público permite iniciar una conversación con nombre, usuario y mensaje, o retomarla con la referencia que se generó al abrirla. La referencia `LMQ-…` funciona como un dato privado de acceso a esa sesión: el cliente debe guardarla y no compartirla.
- La bandeja se actualiza cada 12 segundos y el chat del cliente consulta respuestas cada 7 segundos.
- La API crea las tablas `support_conversations` y `support_messages` si aún no existen en la base indicada. No elimina ni modifica otras tablas.

## Configuración local

1. Crea una copia local de `.env.example` llamada `.env`. No agregues este archivo al control de versiones ni publiques sus valores.
2. Configura los datos de conexión MySQL (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`), el usuario y contraseña del agente y una clave aleatoria de al menos 32 caracteres en `AUTH_TOKEN_SECRET`. Configura también las variables SMTP `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_REQUIRE_TLS`, `SMTP_IGNORE_TLS`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` y `SMTP_FROM_NAME` en `MailEngine/.env`. El ejemplo utiliza `lemarquet_asistance` como nombre de base.
3. Usa una cuenta MySQL dedicada, no `root`. Un administrador de MySQL puede preparar la base y una cuenta limitada con estos comandos (reemplaza el marcador por una contraseña única y adapta el host si la API se conecta desde otra máquina):

   ```sql
   CREATE DATABASE IF NOT EXISTS lemarquet_asistance
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'lemarquet_support'@'localhost'
     IDENTIFIED BY 'replace-with-a-strong-unique-database-password';
   GRANT SELECT, INSERT, UPDATE, CREATE, ALTER ON lemarquet_asistance.*
     TO 'lemarquet_support'@'localhost';
   ```

   El inicio de la API crea las tablas si faltan y agrega la columna de correo a la tabla de conversaciones existente, por lo que la cuenta necesita `CREATE` y `ALTER`, además de `SELECT`, `INSERT` y `UPDATE`. No necesita permisos globales.
4. Instala dependencias con `npm install` y ejecuta `npm run dev:all`. Vite sirve la página en el puerto `5176` y reenvía `/api` al servidor Express en el puerto `3220`.
5. Abre `http://localhost:5176/#/atencion` para iniciar sesión como agente. Los clientes pueden usar el botón de chat de la página pública.

Se requiere Node.js 22.15 o superior para iniciar el backend con `--use-system-ca`. Esta opción permite a Node confiar en el almacén de certificados de Windows cuando Avast Web/Mail Shield inspecciona SMTP, conservando la validación TLS. No desactives la validación de certificados.

En un despliegue, configura las mismas variables en el gestor de secretos del servidor, ejecuta el backend detrás de HTTPS y limita el acceso a la ruta de agentes a los usuarios autorizados. No expongas MySQL a Internet. El token de agente se conserva solo en memoria de la página y vence después de ocho horas.

## API

- `POST /api/auth/login` — autenticación de agente.
- `GET /api/conversations?q=&status=` — bandeja autenticada (máximo 100 resultados).
- `GET /api/conversations/:id/messages` y `POST /api/conversations/:id/messages` — leer y responder.
- `PATCH /api/conversations/:id/status` — actualizar estado (`open`, `pending`, `closed`).
- `POST /api/public/conversations` — crear una sesión y obtener su referencia.
- `GET /api/public/conversations/:reference/messages` y `POST /api/public/conversations/:reference/messages` — consultar y continuar una sesión con su referencia.
- `POST /api/public/email-verification/request` y `POST /api/public/email-verification/verify` — solicitar y verificar códigos de inicio o recuperación enviados por MailEngine.
- `GET /api/public/customer/conversations` — listar chats asociados al correo verificado.
- `POST /api/public/customer/conversations/link` — asociar una conversación antigua mediante su referencia.
- `GET /api/public/customer/conversations/:id/messages` y `POST /api/public/customer/conversations/:id/messages` — consultar y responder a chats recuperados mediante correo.

Los códigos de correo vencen en 10 minutos y permiten hasta 5 intentos; las sesiones verificadas vencen en 15 minutos. Los chats nuevos se asocian al correo verificado. Los chats anteriores no tienen correo registrado: podrán recuperarse al vincularlos con su referencia una vez. Si se perdió también la referencia de un chat anterior, deberá localizarlo un agente. Las rutas de agentes requieren un token Bearer. La API valida y limita el tamaño de las entradas, usa consultas MySQL parametrizadas y aplica límites de solicitudes al inicio de sesión y a los endpoints públicos.
