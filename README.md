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
│   │   └── session-store.ts   # Zustand: status/tokens/user + wiring del interceptor
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

## Lockfile (`pnpm-lock.yaml`)

El lockfile se versiona. CI, el e2e y Vercel instalan con `--frozen-lockfile`: sin `pnpm-lock.yaml`
commiteado fallan a propósito (el CI con un mensaje que lo explica). Es **requisito de Vercel**.

Como `@voyyaa/shared` se instala desde GitHub Packages (ADR-016), el lockfile se genera con el
workflow **Actualizar lockfile**, que usa el secreto `NPM_TOKEN`:

1. Crea el secreto `NPM_TOKEN` en el repo (Settings > Secrets and variables > Actions): un token con
   `read:packages`.
2. Activa Settings > Actions > General > "Allow GitHub Actions to create and approve pull requests".
3. Actions > **Actualizar lockfile** > **Run workflow** (rama `main`).
4. Revisa y mezcla el PR `chore: regenerar pnpm-lock.yaml` que abre. Repite el paso 3 cada vez que
   cambien las dependencias de `package.json` o la versión de `@voyyaa/shared`.

CI también corre `pnpm audit --prod --audit-level high` y falla con vulnerabilidades High o Critical.

## Identidad visual y tokens

La consola usa la misma identidad que las apps y el sitio (ADR-026): ámbar `#F4A21A`, espresso
`#2A2018`, crema `#FBF6ED`, verde `#12A46A`. Los valores viven en `tailwind.config.js` y
`src/index.css` (claro y oscuro); el selector de tema está en el menú de usuario (Según el sistema ·
Claro · Oscuro) y se guarda en `localStorage`.

Tipografía autoalojada (sin CDN): **Nunito** (`font-display`), **Nunito Sans** (`font-body`) y
**JetBrains Mono** (`.text-numeric`), con `@fontsource-variable/*` importadas una sola vez en
`src/main.tsx`. La pila de reserva (`ui-rounded`, `Segoe UI`, `system-ui`) evita texto invisible
mientras cargan.

Componentes de marca: `Button`, `Field`, `Notice`, `StepRail`, `StatStrip`, `ProgressRail`,
`Spinner`, `BrandLoader` y `StateGlyph`; su CSS (`vy-*`) está en `src/index.css`. Los overlays
(`ConfirmDialog`, `DetailDrawer`, `UserMenu`) usan Radix.

## Pruebas

```bash
pnpm test:tokens   # contrato de tokens: hex de la tabla y ratios de contraste AA (node:test)
BASE_URL=http://localhost:5173 pnpm test:e2e   # Playwright, incluye axe, tamaños táctiles y reduce-motion
```

## Variables de entorno

Vite solo expone al bundle del cliente las variables con prefijo `VITE_*` (build-time).

| Variable                  | Descripción                                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`            | URL base del backend NestJS (`http://localhost:3000` en local).                                                                                                         |
| `VITE_PRIVACY_POLICY_URL` | URL pública de la política de tratamiento de datos (`privacy-policy.html` de `voyya-page`). Si falta, el formulario de afiliación muestra el consentimiento sin enlace. |

## Deploy en Vercel

1. Conecta este repo de GitHub en Vercel ("Add New… → Project").
2. **Root Directory**: raíz del repo (no hay subcarpeta `apps/admin` aquí — el repo completo
   ES la app). `vercel.json` ya declara `framework: "vite"`, `installCommand: "pnpm install --frozen-lockfile"`,
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
   `AdminLoginDTO`, `SessionResponse`, `SessionTokens`, `SessionUser`, `RefreshDTO`,
   `RefreshResponse`, `LogoutDTO`, `LogoutResponse`, `AuthError`, `AuthErrorCode`, `Role`).

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
