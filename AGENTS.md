# Project Guidelines

Juego de regalos navideño ("Juego del Prisionero"): sitio estático donde cada participante elige
su nombre, lee las reglas ([Reglas.txt](Reglas.txt)) y envía el link de su regalo. El backend
guarda el link + metadatos (IP, geo aproximada por IP, user-agent, resolución, idioma, timezone)
para identificar envíos. No hay cálculo de montos/presupuesto en código: esa lógica del juego es
solo narrativa mostrada al usuario, la decide el dueño del juego manualmente revisando los datos.

Ver [README.md](README.md) para instrucciones completas de build/deploy.

## Architecture

- `frontend/` — HTML + CSS + TypeScript vanilla, **sin bundler ni framework**, pensado para
  GitHub Pages. `src/main.ts` maneja un flujo de 3 pasos (participante → reglas → form de link)
  mostrando/ocultando secciones con clase `.hidden`.
- `backend/` — AWS SAM: API Gateway HttpApi (`POST /submit`) + Lambda TypeScript + DynamoDB
  (PK `participant`, SK `submittedAt`, permite múltiples envíos por persona a propósito para
  detectar tramposos manualmente). Sin panel admin: los datos se revisan directo en la consola
  DynamoDB.
- Las listas de nombres (`frontend/src/participants.ts` y `backend/src/participants.ts`) son
  independientes y **deben mantenerse idénticas a mano**.

## Build and Test

```powershell
# frontend
cd frontend; npm install; npm run build   # tsc -> dist/*.js

# backend
cd backend; npm install; npx tsc --noEmit  # type-check
sam build; sam deploy --guided             # requiere AWS CLI/SAM CLI + credenciales
```

Para previsualizar el frontend localmente, sirve la carpeta (ej. `npx serve .` desde la raíz) y
abre `http://localhost:<puerto>/frontend/` — abrir `index.html` directo con `file://` rompe el
`<script type="module">`.

`sam local invoke` requiere Docker; si no está disponible, valida el handler compilado invocándolo
directo con `node -e "require('./.aws-sam/build/SubmitFunction/submit.js').handler(...)"`.

## Conventions / Gotchas

- **Runtime Lambda**: `nodejs24.x` (nodejs20.x quedó deprecado en 2026-04-30, lo marca
  `sam validate --lint`).
- **esbuild debe estar en `dependencies`, no `devDependencies`** en `backend/package.json`: el
  build de SAM corre `npm install --omit=dev`, así que devDependencies no sobreviven.
- **`CodeUri` del Lambda debe apuntar a la carpeta que contiene `package.json`** (raíz de
  `backend/`, no `backend/src/`), con `Handler: src/submit.handler` y
  `EntryPoints: [src/submit.ts]` en `Metadata.BuildProperties`.
- **Imports ESM en frontend**: como no hay bundler y el navegador carga módulos nativos, los
  imports en `.ts` deben escribirse con extensión `.js` (ej. `from "./participants.js"`), y
  `tsconfig.json` usa `"moduleResolution": "Bundler"` para permitir esa resolución en type-check.
- `style.css` usa `color-scheme: light` a propósito (no `light dark`) para evitar que los
  controles de formulario se rendericen oscuros en navegadores con modo oscuro activado.
- No hay borrado automático de datos/infra (decisión del usuario): se documenta `sam delete`
  manual en el README cuando termine el juego.
