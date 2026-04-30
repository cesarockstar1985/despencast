# DespenCast

Aplicacion hibrida de:
- Bot de Telegram para registrar productos y consultar cuenta.
- Panel web de administracion para ver deudas y gestionar clientes.

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm
- Token de bot de Telegram
- Google Service Account con acceso de lectura a Sheets

## Instalacion

```bash
npm install
```

## Variables de entorno

Crea un archivo `.env` en la raiz del proyecto tomando `.env-example` como base.

Variables esperadas:

- `NODE_ENV`: `development` o `production`
- `PORT`: puerto del servidor web (por defecto 3000)
- `SESSION_SECRET`: secreto de sesion (obligatorio en produccion)
- `TELEGRAM_TOKEN`: token del bot de Telegram
- `SPREADSHEET_ID`: ID del Google Sheet de productos
- `GOOGLE_JSON_CONTENT`: JSON completo de la service account en una sola linea
- `ADMIN_USERNAME`: usuario admin para seed (opcional, default `admin`)
- `ADMIN_PASSWORD`: password admin para seed (obligatorio al ejecutar seed)
- `RAILWAY_VOLUME_MOUNT_PATH`: ruta persistente opcional para SQLite en Railway

Ejemplo de carga de `GOOGLE_JSON_CONTENT`:

```env
GOOGLE_JSON_CONTENT={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

## Scripts disponibles

- `npm run dev`: arranque en desarrollo con `nodemon`
- `npm start`: arranque normal con `node index.js`
- `npm run seed:admin`: crea usuario admin (usa `ADMIN_USERNAME` y `ADMIN_PASSWORD`)
- `npm run check`: chequeo rapido de sintaxis (`index.js` y `bot.js`)

## Arranque local

1. Configura `.env` con todas las variables.
2. Ejecuta:

```bash
npm run dev
```

3. Abre el panel web en `http://localhost:3000/login`.
4. Interactua con el bot en Telegram usando los comandos (`/start`, `/catalogo`, `/cuenta`, etc.).

## Flujo funcional

- `index.js` levanta Express y sesiones, y carga rutas web.
- `bot.js` inicia el bot Telegram en modo polling.
- `leerSheet.js` consulta Google Sheets para obtener catalogo.
- SQLite persiste clientes, pedidos y usuarios admin.

## Seguridad de secretos

- No versionar archivos de credenciales como `keys.json`.
- Mantener secretos solo en variables de entorno.
- Usar `SESSION_SECRET` largo y aleatorio.
- Nunca hardcodear passwords en scripts o codigo fuente.

## Rotacion recomendada de credenciales (Google)

1. Ir a Google Cloud Console > IAM & Admin > Service Accounts.
2. Revocar/eliminar cualquier clave anterior comprometida.
3. Generar una nueva clave.
4. Actualizar `GOOGLE_JSON_CONTENT` en entorno local y produccion.
5. Reiniciar la app y validar lectura de catalogo.

## Troubleshooting

- Error `GOOGLE_JSON_CONTENT no esta configurada`:
  - Revisar `.env` y confirmar formato JSON valido.
- Error de login o sesiones inestables:
  - Verificar `SESSION_SECRET`.
  - En produccion, confirmar HTTPS para cookie `secure`.
- Bot no responde:
  - Revisar `TELEGRAM_TOKEN`.
  - Confirmar que el proceso corre sin errores en consola.
- No aparecen productos:
  - Revisar permisos de service account sobre el Google Sheet.
  - Verificar `SPREADSHEET_ID`.

## Estado actual / pendientes

- [x] Hardening inicial de secretos y sesion
- [x] Proteccion de rutas administrativas
- [x] Correccion de flujo barcode por buffer
- [ ] Implementar consulta de cuenta por rango (en construccion)
- [ ] Agregar tests automatizados y lint

## Deploy en Railway (guia rapida)

1. Crear proyecto en Railway y conectar este repositorio.
2. Configurar variables de entorno:
   - `NODE_ENV=production`
   - `PORT` (Railway normalmente lo inyecta)
   - `SESSION_SECRET`
   - `TELEGRAM_TOKEN`
   - `SPREADSHEET_ID`
   - `GOOGLE_JSON_CONTENT`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD` (solo para seed)
   - `RAILWAY_VOLUME_MOUNT_PATH` (para persistencia SQLite)
3. Configurar comando de inicio: `npm start`.
4. Desplegar y revisar logs de arranque.
5. Ejecutar seed admin una sola vez (`npm run seed:admin`) en un job/terminal del entorno.

## Checklist pre-produccion

- [ ] `SESSION_SECRET` fuerte y unico por entorno
- [ ] Sin archivos de secretos en repo (`keys.json`, etc.)
- [ ] Credenciales de Google rotadas y vigentes
- [ ] Bot responde `/start`, `/catalogo`, `/cuenta`
- [ ] Login admin y rutas protegidas funcionando
- [ ] Lectura de productos desde Google Sheets verificada
- [ ] Backup/retencion del archivo SQLite definido
- [ ] Logs de errores revisados sin fallos criticos