# Juego del Prisionero - Navidad 2026

Sitio para gestionar el juego de regalos: cada participante elige su nombre, lee las reglas y
envía el link de su regalo. El backend guarda el link + metadatos (IP, geolocalización
aproximada, user-agent, resolución, idioma, timezone) en DynamoDB para poder identificar envíos.

## Estructura

- `frontend/` — sitio estático (HTML + CSS + TypeScript sin bundler), pensado para GitHub Pages.
- `backend/` — API en AWS (SAM: API Gateway HTTP API + Lambda TypeScript + DynamoDB).

## Antes de deployar

1. Completa los nombres reales en **ambos** archivos (deben coincidir exactamente):
   - [frontend/src/participants.ts](frontend/src/participants.ts)
   - [backend/src/participants.ts](backend/src/participants.ts)
2. En [backend/template.yaml](backend/template.yaml), cambia el parámetro `AllowedOrigin` por tu
   dominio real de GitHub Pages (ej. `https://tu-usuario.github.io`).

## Backend (AWS SAM)

Requiere AWS CLI + SAM CLI configurados con tus credenciales.

```powershell
cd backend
npm install
sam build
sam deploy --guided
```

Al terminar, copia el valor del Output `ApiUrl` y pégalo en
[frontend/src/main.ts](frontend/src/main.ts) (constante `API_URL`).

Para probar localmente antes de deployar:

```powershell
sam local start-api
```

## Frontend (estático)

```powershell
cd frontend
npm install
npm run build
```

Esto compila `src/*.ts` a `dist/*.js`. Para probarlo localmente, sirve la carpeta `frontend/`
con cualquier servidor estático (ej. la extensión "Live Server" de VS Code) y abre `index.html`.

### Publicar en GitHub Pages

1. Sube el repo a GitHub.
2. En Settings → Pages, configura la fuente como la carpeta `frontend/` (rama `main`) — o copia
   el contenido de `frontend/` a una rama `gh-pages` / carpeta `/docs` según prefieras.
3. Asegúrate de haber corrido `npm run build` en `frontend/` antes de publicar, para que exista
   `frontend/dist/main.js`.

## Revisar los envíos

No hay panel de administración. Los envíos se revisan directo en la consola de AWS:
DynamoDB → tabla `GiftSubmissionsTable` (nombre exacto en el Output `TableName` del stack).

## Apagar todo cuando termine el juego

No hay borrado automático (ni de datos ni de infraestructura): el costo en reposo de este stack
(Lambda + API Gateway HTTP API + DynamoDB on-demand) es prácticamente $0, así que no hay apuro.
Cuando el juego termine y ya hayas revisado los datos en DynamoDB, borra todo con:

```powershell
cd backend
sam delete
```

Esto elimina la función Lambda, la API y la tabla (y con ella, todos los links/metadatos).

## Notas de seguridad

- El link se valida en el backend (debe ser una URL `http`/`https` bien formada).
- El CORS de la API está restringido al origin configurado en `AllowedOrigin`.
- La geolocalización por IP es "best effort": si el servicio externo falla, el envío se guarda
  igual, solo sin datos de geo.
- El navegador no puede exponer el "nombre real" del dispositivo; los metadatos capturados son
  aproximados (IP, geo por IP, user-agent, resolución, idioma, timezone).
