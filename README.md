# frontend-yavoy-admin

Consola web de administración de **VoyYa** (Vite + React + TypeScript + Tailwind). Repo
**standalone** (sin workspace compartido) desplegado en **Vercel**, independiente del monorepo
VoyYa y del repo móvil `frontend-yavoy` (EAS).

## Estructura

```
frontend-yavoy-admin/
├── src/
│   ├── contracts/
│   │   └── auth.ts          # VENDORIZADO desde packages/shared (ver § sincronización)
│   ├── api/
│   │   ├── http-client.ts    # fetch tipado + interceptor Authorization/401→refresh
│   │   ├── auth.api.ts        # login/refresh/logout (POST /auth/admin/login, /auth/refresh, /auth/logout)
│   │   ├── health.api.ts      # GET /health
│   │   └── errors.ts          # ApiError (network | http | validation)
│   ├── lib/
│   │   └── local-storage.ts   # persistencia de sesión (localStorage)
│   ├── state/
│   │   └── session-store.ts   # Zustand: status/tokens/usuario + wiring del interceptor
│   ├── components/
│   │   ├── RouteGuard.tsx      # sin sesión → /login
│   │   ├── HealthIndicator.tsx
│   │   └── PlaceholderCard.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx       # correo + password (react-hook-form + zodResolver)
│   │   └── DashboardPage.tsx   # sesión + salud + tarjetas "próximo ciclo"
│   ├── App.tsx                 # rutas (react-router-dom) + guard
│   └── main.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.js / postcss.config.js
├── tsconfig.json
├── vercel.json
└── .env.example
```

## Requisitos

- Node.js ≥ 20, [pnpm](https://pnpm.io) (cualquier 9.x/10.x reciente sirve — este repo no fija
  una versión de `packageManager` al no ser un workspace)
- Un backend VoyYa corriendo (o accesible) para `VITE_API_URL`, con **CORS habilitado** para el
  origen de esta consola (localhost en dev, el dominio de Vercel en producción)

## Correr en desarrollo

```bash
pnpm install
cp .env.example .env.local     # ajusta VITE_API_URL
pnpm dev                       # http://localhost:5173
```

## Variables de entorno

Vite solo expone al bundle del cliente las variables con prefijo `VITE_*` (build-time).

| Variable       | Descripción                                                  |
| -------------- | ------------------------------------------------------------- |
| `VITE_API_URL` | URL base del backend NestJS (`http://localhost:3000` en local). |

## Deploy en Vercel

1. Conecta este repo de GitHub en Vercel ("Add New… → Project").
2. **Root Directory**: raíz del repo (no hay subcarpeta `apps/admin` aquí — el repo completo
   ES la app). `vercel.json` ya declara `framework: "vite"`, `installCommand: "pnpm install"`,
   `buildCommand: "pnpm build"`, `outputDirectory: "dist"` — Vercel los detecta solos.
3. **Environment Variables**: agrega `VITE_API_URL` (valor del backend en producción/staging).
4. Deploy. Cada push a `main` (o cada PR, según la config del proyecto) dispara un build nuevo.

`vercel.json` incluye un rewrite catch-all a `/index.html` para que las rutas de
`react-router-dom` (`/login`, `/`) funcionen en refresh/deep-link (SPA sin servidor propio).

## Nota de sincronización de contratos (`src/contracts/auth.ts`)

Este repo **no** comparte workspace con el monorepo VoyYa ni con `frontend-yavoy`: no puede
resolver `@voyya/shared` por `workspace:*`. Para no reinventar a mano los DTOs/esquemas Zod de
auth, `src/contracts/auth.ts` es una **copia vendorizada** (byte a byte) de
`packages/shared/src/contracts/auth.ts` del monorepo VoyYa.

Esto crea una **tercera copia** del contrato de auth (las otras dos: `backend-yavoy` y
`frontend-yavoy/packages/shared`) — las tres deben tener el mismo contenido para ese dominio.
**Si el contrato de auth cambia (nuevo campo, nuevo código de error, nuevo endpoint), replica
el cambio aquí también en el mismo PR/commit lógico.**

Opciones para el futuro (fuera de alcance de este assembly):

1. Publicar `@voyya/shared` como paquete **privado** (npm/GitHub Packages) y consumirlo aquí
   como dependencia versionada normal — elimina el copy-paste.
2. Reducir el vendored file a solo lo que esta consola usa (ya es un subconjunto pequeño:
   `LoginAdminDTO`, `RespuestaSesion`, `SesionTokens`, `UsuarioSesion`, `RefreshDTO`,
   `RespuestaRefresh`, `LogoutDTO`, `RespuestaLogout`, `ErrorAuth`, `CodigoErrorAuth`, `Rol`).

## Qué es mínimo (este ciclo) vs. próximo ciclo

**Mínimo (implementado, real):**

- Login admin/operador real contra `POST /auth/admin/login`, con validación Zod del propio
  contrato vendorizado (no reglas reinventadas a mano).
- Sesión persistida en `localStorage` + interceptor que agrega `Authorization: Bearer` y
  refresca una vez en 401 vía `POST /auth/refresh` (rotación de tokens) antes de forzar logout.
- Guard de ruta (`/` exige sesión; sin sesión → `/login`).
- Dashboard con datos reales de la sesión (nombre/rol) e indicador de salud real
  (`GET /health`, con botón "Revisar").
- Logout real (`POST /auth/logout`, idempotente) que limpia la sesión local igual si la
  llamada de red falla.

**Próximo ciclo (placeholders explícitos en el dashboard, sin lógica ni datos falsos):**

- **Cola en vivo** — solicitudes de viaje en curso.
- **Conductores** — alta/estado/disponibilidad de la flota.
- **Tarifas** — parámetros de tarifa por municipio/empresa.
- **Conciliación** — cierre de caja y conciliación de viajes en efectivo.
- Refresh proactivo (antes de que expire el access token, no solo reactivo en 401).
- RBAC visual por rol (admin vs. operador) más allá de mostrar el rol como texto.

## Verificación

```bash
pnpm install
pnpm build     # tsc --noEmit (TS strict) + vite build → dist/
```

## Principios

TypeScript **strict** (sin `any` — regla dura vía ESLint `@typescript-eslint/no-explicit-any:
error`), SOLID/DRY/KISS, sin secretos versionados (`.env*` real está en `.gitignore`; solo
`.env.example` se versiona).
