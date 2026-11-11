# Lemarquet

Landing page de Lemarquet y módulo de atención a clientes con chat y API en Express/MySQL.

## Requisitos

- Node.js 22.15 o superior y npm.
- MySQL accesible desde el servidor.
- Una base `lemarquet_asistance` y un usuario de base de datos dedicado con los permisos necesarios. No configures la cuenta `root` en la aplicación.

## Configuración local

Desde la carpeta raíz del proyecto, crea `.env` a partir del ejemplo si aún no existe:

```powershell
Copy-Item .env.example .env
```

Edita `.env` y define la conexión MySQL (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`), las credenciales del agente (`ASSISTANCE_USERNAME`, `ASSISTANCE_PASSWORD`), una clave aleatoria de al menos 32 caracteres para `AUTH_TOKEN_SECRET` y las variables SMTP `SMTP_*` para enviar códigos de recuperación mediante `MailEngine`. El puerto del backend se configura con `PORT` y por defecto es `3220`.

El backend inicia con la opción `--use-system-ca` de Node para validar certificados SMTP contra el almacén de certificados de Windows, incluido el certificado de Avast Web/Mail Shield cuando inspecciona el correo. Mantén activa la validación TLS; no uses `NODE_TLS_REJECT_UNAUTHORIZED=0`.

La API crea las tablas `support_conversations` y `support_messages` al iniciar si todavía no existen. Prepara la base y concede a la cuenta de aplicación permisos limitados sobre esa base. Consulta [docs/ATENCION_CLIENTES.md](./docs/ATENCION_CLIENTES.md) para ver los permisos sugeridos y los detalles del chat y sus endpoints.

Instala las dependencias:

```powershell
npm install
```

## Iniciar la aplicación

Ejecuta desde la raíz del proyecto:

```powershell
npm run dev:all
```

Esto inicia el frontend Vite en `http://localhost:5176` y el backend Express en `http://localhost:3220`. Vite reenvía las peticiones `/api` al backend.

Para iniciar solo un servicio:

```powershell
npm run dev         # Frontend, puerto 5176
npm run dev:server  # Backend, puerto 3220
```

El panel de agentes está en `http://localhost:5176/#/atencion`. Los clientes pueden iniciar o retomar un chat desde el botón **Atención a clientes** de la página.

## Compilación

```powershell
npm run build
```

Mantén `.env` fuera del control de versiones y no expongas el puerto de MySQL a Internet.
