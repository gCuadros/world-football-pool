# Puesta en marcha — Quiniela Mundial 2026

Guía para arrancar el proyecto en local. La **Fase 1** (autenticación + base de
datos + login + shell de la app) ya está implementada.

## 1. Requisitos

- Node.js 20+ (probado con v22)
- Una cuenta de [Supabase](https://supabase.com) (capa gratuita suficiente)

## 2. Crear el proyecto en Supabase

1. Entra en Supabase → **New project**. Elige nombre, contraseña de BD y región.
2. Ve a **Project Settings → Database → Connection string**.
3. Necesitas **dos** cadenas:
   - **Transaction pooler** (puerto `6543`) → `DATABASE_URL`. Añade
     `?pgbouncer=true` al final.
   - **Direct connection** (puerto `5432`) → `DIRECT_URL` (la usa Prisma para
     migraciones).

> Supabase aquí se usa **solo como base de datos PostgreSQL**. La autenticación
> la gestiona NextAuth (no Supabase Auth).

## 3. Configurar variables de entorno

Copia el ejemplo y rellena tus valores:

```bash
cp .env.example .env
```

```dotenv
DATABASE_URL="postgresql://postgres.XXXX:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.XXXX:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
AUTH_SECRET="genera-uno-con: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"
ADMIN_SECRET="genera-uno-con: openssl rand -hex 16"
# Feature flags (se evalúan en build; cambiarlos requiere redeploy)
NEXT_PUBLIC_FEATURE_MINI_LEAGUES="false"
```

Genera los secretos con:

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -hex 16      # ADMIN_SECRET
```

## 4. Instalar, migrar y sembrar

```bash
yarn                    # instala dependencias
yarn db:generate        # genera el cliente Prisma
yarn db:push            # crea las tablas en Supabase
yarn db:seed            # carga los 104 partidos reales del Mundial 2026 + usuarios demo
```

## 5. Arrancar

```bash
yarn dev
```

Abre <http://localhost:3000>. Te redirige a `/login`.

### Cuentas demo (contraseña: `password123`)

| Email                  | Rol                          |
| ---------------------- | ---------------------------- |
| `gonzalo@quiniela.app` | usuario principal (precargado) |
| `lucia@quiniela.app`   | líder de la clasificación      |
| `marco@quiniela.app`   | …                            |
| `aisha@quiniela.app`   | …                            |

(8 usuarios en total; mira `prisma/seed.ts`.)

También puedes crear una cuenta nueva desde la pestaña **Crear cuenta**.

## 6. Scripts útiles

| Script             | Descripción                             |
| ------------------ | --------------------------------------- |
| `yarn dev`         | servidor de desarrollo                  |
| `yarn build`       | build de producción                     |
| `yarn db:studio`   | Prisma Studio (explorar la BD)          |
| `yarn db:seed`     | re-sembrar (borra y recarga datos demo) |
| `yarn db:push`     | sincronizar schema con la BD            |
| `yarn db:generate` | regenerar cliente Prisma                |

## Qué incluye la Fase 1

- **Stack**: Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui ·
  Prisma → Supabase · NextAuth v5 (credenciales).
- **Auth**: registro e inicio de sesión con email/contraseña (hash bcrypt),
  rutas protegidas vía `proxy.ts`.
- **BD**: esquema completo (usuarios, partidos, predicciones, mini-ligas,
  logros, clasificación) y seed con los **104 partidos** reales del Mundial 2026
  (12 grupos A–L + eliminatorias), usuarios demo, predicciones puntuadas,
  clasificación y una mini-liga.
- **UI**: página `/login` (split-screen), shell autenticado con sidebar de
  260px + topbar (búsqueda, tema claro/oscuro, salir), y páginas de la app.
- El motor de puntuación (`src/lib/scoring.ts`) y la regla de cierre de
  predicciones a 15 min ya están implementados y se reutilizarán en la Fase 2.

## Diseño de la base de datos

PostgreSQL gestionado con Prisma. El esquema fuente está en
[`prisma/schema.prisma`](./prisma/schema.prisma). Resumen completo del modelo.

### Diagrama de relaciones

```
                         ┌──────────────────────┐
                         │         User         │
                         │ (cuenta + perfil)    │
                         └──────────┬───────────┘
        ┌───────────────┬──────────┼───────────┬──────────────┬───────────────┐
        │ 1:N           │ 1:N      │ 1:N       │ 1:N          │ 1:1           │ 1:N (NextAuth)
        ▼               ▼          ▼           ▼              ▼               ▼
  ┌───────────┐  ┌─────────────┐ ┌──────────┐ ┌────────────────────┐ ┌──────────────┐ ┌──────────────────┐
  │Prediction │  │MiniLeague   │ │Achievement│ │LeaderboardSnapshot │ │ Account /     │
  │           │  │Member       │ │          │ │ (1 fila por user)  │ │ Session       │
  └─────┬─────┘  └──────┬──────┘ └──────────┘ └────────────────────┘ └──────────────┘
        │ N:1           │ N:1
        ▼               ▼
  ┌───────────┐  ┌─────────────┐
  │   Match   │  │ MiniLeague  │◄── createdBy (N:1 → User)
  └───────────┘  └─────────────┘

  VerificationToken  (independiente, soporte NextAuth)
```

- `User` es el centro: tiene muchas predicciones, pertenece a muchas mini-ligas
  (vía `MiniLeagueMember`), desbloquea logros y tiene **una** fila de
  clasificación (`LeaderboardSnapshot`, relación 1:1).
- `Prediction` une `User` ↔ `Match` (única por `(userId, matchId)`).
- `MiniLeagueMember` une `User` ↔ `MiniLeague` (única por `(userId, miniLeagueId)`).
- Todas las relaciones a `User`/`Match`/`MiniLeague` usan `onDelete: Cascade`.

### Enums

| Enum              | Valores                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `Stage`           | `GROUP_STAGE`, `ROUND_OF_32`, `ROUND_OF_16`, `QUARTER_FINAL`, `SEMI_FINAL`, `THIRD_PLACE`, `FINAL` |
| `MatchStatus`     | `UPCOMING`, `LIVE`, `FINISHED`                                                                   |
| `AchievementType` | `PERFECT_SCORE`, `STREAK_3`, `STREAK_5`, `STREAK_10`, `TOP_10`, `TOP_3`, `ALL_GROUP_STAGE`, `CHAMPION_CALL` |

### Tablas

#### `User` — cuenta y perfil

| Campo           | Tipo        | Notas                                         |
| --------------- | ----------- | --------------------------------------------- |
| `id`            | String (cuid) | PK                                          |
| `email`         | String      | **único**                                     |
| `name`          | String?     |                                               |
| `avatar`        | String?     | iniciales o URL                               |
| `passwordHash`  | String?     | hash **bcrypt** (proveedor de credenciales)   |
| `emailVerified` | DateTime?   | NextAuth                                      |
| `image`         | String?     | NextAuth                                      |
| `createdAt`     | DateTime    | `@default(now())`                             |
| `updatedAt`     | DateTime    | `@updatedAt`                                  |

Relaciones: `predictions[]`, `miniLeagueMembers[]`, `miniLeaguesCreated[]`,
`achievements[]`, `leaderboardSnapshot?`, `accounts[]`, `sessions[]`.

#### `Match` — partido del torneo

| Campo        | Tipo         | Notas                                          |
| ------------ | ------------ | ---------------------------------------------- |
| `id`         | String (cuid) | PK                                            |
| `matchNo`    | Int          | **único** · número de partido (1..104)         |
| `homeTeam`   | String       |                                                |
| `awayTeam`   | String       |                                                |
| `homeFlag`   | String?      | emoji/código de bandera                        |
| `awayFlag`   | String?      |                                                |
| `kickoffAt`  | DateTime     | **siempre en UTC** · `@@index`                 |
| `stage`      | `Stage`      | `@@index`                                      |
| `group`      | String?      | A–L en fase de grupos                          |
| `stadium`    | String       |                                                |
| `city`       | String?      |                                                |
| `homeScore`  | Int?         | `null` hasta que empieza/termina               |
| `awayScore`  | Int?         |                                                |
| `status`     | `MatchStatus` | `@default(UPCOMING)` · `@@index`              |
| `liveMinute` | Int?         | minuto de juego si `LIVE`                      |
| `createdAt` / `updatedAt` | DateTime | |

Índices: `kickoffAt`, `status`, `stage`. Relación: `predictions[]`.

#### `Prediction` — pronóstico de un usuario para un partido

| Campo         | Tipo         | Notas                                              |
| ------------- | ------------ | -------------------------------------------------- |
| `id`          | String (cuid) | PK                                                |
| `userId`      | String       | FK → `User` (cascade)                              |
| `matchId`     | String       | FK → `Match` (cascade)                             |
| `homeScore`   | Int          | marcador previsto local                            |
| `awayScore`   | Int          | marcador previsto visitante                        |
| `points`      | Int?         | `null` hasta calcular · 3 exacto / 1 resultado / 0 |
| `submittedAt` | DateTime     | `@default(now())`                                  |
| `updatedAt`   | DateTime     | `@updatedAt`                                       |

**Restricción única**: `@@unique([userId, matchId])` (una predicción por
usuario y partido). Índices: `matchId`, `userId`.

#### `MiniLeague` — liga privada

| Campo         | Tipo         | Notas                          |
| ------------- | ------------ | ------------------------------ |
| `id`          | String (cuid) | PK                            |
| `name`        | String       |                                |
| `inviteCode`  | String       | **único** · 6 caracteres       |
| `createdById` | String       | FK → `User` (cascade)          |
| `createdAt`   | DateTime     | `@default(now())`              |

Relaciones: `createdBy` (User), `members[]`.

#### `MiniLeagueMember` — pertenencia usuario↔liga (tabla puente)

| Campo          | Tipo         | Notas                       |
| -------------- | ------------ | --------------------------- |
| `id`           | String (cuid) | PK                         |
| `userId`       | String       | FK → `User` (cascade)       |
| `miniLeagueId` | String       | FK → `MiniLeague` (cascade) |
| `joinedAt`     | DateTime     | `@default(now())`           |

**Restricción única**: `@@unique([userId, miniLeagueId])`. Índice: `miniLeagueId`.

#### `Achievement` — logro desbloqueado

| Campo        | Tipo              | Notas                  |
| ------------ | ----------------- | ---------------------- |
| `id`         | String (cuid)     | PK                     |
| `userId`     | String            | FK → `User` (cascade)  |
| `type`       | `AchievementType` |                        |
| `unlockedAt` | DateTime          | `@default(now())`      |

**Restricción única**: `@@unique([userId, type])` (no se repite un logro).
Índice: `userId`.

#### `LeaderboardSnapshot` — clasificación materializada (1:1 con User)

Tabla precalculada para que el ranking sea rápido; se recalcula al finalizar
partidos.

| Campo              | Tipo   | Notas                                   |
| ------------------ | ------ | --------------------------------------- |
| `id`               | String | PK                                      |
| `userId`           | String | **único** · FK → `User` (cascade)       |
| `totalPoints`      | Int    | `@default(0)`                           |
| `predictionsCount` | Int    | predicciones ya puntuadas               |
| `exactCount`       | Int    | aciertos de marcador exacto (3 pts)     |
| `correctCount`     | Int    | aciertos de resultado (1 pt)            |
| `accuracy`         | Float  | precisión 0–100                         |
| `currentStreak`    | Int    | racha de aciertos en curso              |
| `bestStreak`       | Int    | mejor racha histórica                   |
| `rank`             | Int    | puesto actual                           |
| `previousRank`     | Int    | puesto previo (para la tendencia ▲▼)    |
| `updatedAt`        | DateTime | `@updatedAt`                          |

Índices: `totalPoints`, `rank`.

#### Tablas de NextAuth

`Account`, `Session` y `VerificationToken` siguen el contrato de
`@auth/prisma-adapter`. Con la estrategia de sesión **JWT** + credenciales no se
usan activamente todavía, pero quedan listas para añadir Google OAuth en una
fase futura.

### Reglas de negocio ligadas al modelo

- **Cierre de predicciones**: no se puede crear/editar una `Prediction` si
  `kickoffAt - now() ≤ 15 min` (constante `PREDICTION_LOCK_MINUTES` en
  `src/lib/scoring.ts`); se valida en el servidor.
- **Puntuación**: `calculatePoints()` → 3 (exacto), 1 (resultado correcto), 0.
- **Visibilidad social**: la predicción propia es privada antes del kickoff;
  tras `LIVE`/`FINISHED` se muestra la distribución agregada, nunca individual.
- **Tiempo**: todos los `DateTime` se guardan en **UTC**; se convierten al
  huso del usuario en el cliente.

## Administración y simulador (P2)

Endpoints protegidos por `ADMIN_SECRET` (header `x-admin-secret` o
`Authorization: Bearer`). Sirven para introducir resultados reales durante el
torneo (vía un cron o un panel) y, en desarrollo, para ver la app "cobrar vida".

**Actualizar el marcador/estado de un partido** (recalcula al finalizar):

```bash
curl -X PATCH http://localhost:3000/api/admin/matches/<MATCH_ID> \
  -H "x-admin-secret: $ADMIN_SECRET" -H "Content-Type: application/json" \
  -d '{"homeScore":2,"awayScore":1,"status":"FINISHED"}'
```

**Avanzar el torneo un "tick"** (finaliza los partidos en directo con un
marcador y arranca los siguientes; recalcula puntos, clasificación y logros):

```bash
curl -X POST http://localhost:3000/api/admin/simulate \
  -H "x-admin-secret: $ADMIN_SECRET"
```

Tras cada llamada, la clasificación, las rachas y los logros se reconstruyen
automáticamente (`src/lib/recalculate.ts`).

## Google OAuth (opcional)

El inicio de sesión con Google está implementado pero **desactivado** hasta que
configures las credenciales. Para activarlo:

1. En [Google Cloud Console](https://console.cloud.google.com) crea unas
   credenciales OAuth 2.0 (tipo "Web") y añade el redirect URI:
   `http://localhost:3000/api/auth/callback/google` (y el de producción).
2. Añade a `.env`:
   ```dotenv
   AUTH_GOOGLE_ID="..."
   AUTH_GOOGLE_SECRET="..."
   ```
3. Reinicia. El botón "Continuar con Google" aparecerá automáticamente en
   `/login` (si las claves no están, no se muestra y todo sigue con email).

## Origen de datos (Mundial 2026)

Integración **agnóstica del proveedor** (`src/lib/providers/types.ts` →
`FootballProvider`). El proveedor activo se elige en `src/lib/providers/index.ts`:

- **API-Football** (`api-football.ts`) si `API_FOOTBALL_KEY` está definida →
  datos reales + en vivo + **escudos** + eventos.
- **openfootball** (`openfootball.ts`) como fallback sin clave (calendario público).

Piezas: `src/lib/wc-data.ts` (nombres EN→ES, banderas, estadios, horarios UTC) ·
`src/lib/import-fixtures.ts` (`importFixtures`: upsert por `externalId`, no pisa
resultados) · el seed importa los 104 partidos del proveedor activo (48 equipos,
12 grupos A–L).

### Activar API-Football (datos reales + en vivo)

1. Copia tu clave de [dashboard.api-football.com](https://dashboard.api-football.com)
   a `.env`: `API_FOOTBALL_KEY="..."`.
2. `yarn db:seed` → reimporta los fixtures desde API-Football (World Cup = league
   1, season 2026), con escudos y grupos (vía `/standings`).
3. **Eventos** (goles/tarjetas): se cargan on-demand y cacheados en la ficha del
   partido (`/api/matches/[id]/events`), sin gastar cuota en el cron.

**Plan Free (100 req/día)**: el `sync` consume ~2 llamadas (fixtures + standings).
Para resultados en vivo durante el torneo, programa un **cron externo** (Vercel
Hobby no permite crons sub-diarios) — p. ej. [cron-job.org](https://cron-job.org)
o GitHub Actions — que haga cada ~20 min en horario de partidos:

```bash
curl -X POST https://TU-APP.vercel.app/api/admin/sync -H "x-admin-secret: $ADMIN_SECRET"
```

Vigila el consumo en tu dashboard de API-Football para no pasarte de 100/día.

## Rendimiento: Cache Components (PPR + `use cache`)

El proyecto usa **`cacheComponents`** de Next 16 (activado en `next.config.ts`):

- **PPR (Partial Prerendering)**: cada página de la app sirve un *shell* estático
  al instante y transmite el contenido dinámico (tras `auth()`) vía `<Suspense>`.
- **`use cache`**: los datos **compartidos** (calendario, clasificación, equipos)
  se cachean con `'use cache'` + `cacheTag` + `cacheLife` en `src/lib/queries.ts`
  y `src/lib/leaderboard.ts`. En Vercel persisten en la Runtime/Data Cache (entre
  peticiones, regiones y despliegues) sin necesidad de Redis/KV.
- **Shell sin BD**: el sidebar/topbar (`src/app/(app)/layout.tsx`) toman el
  nombre/iniciales del **JWT de sesión** y el **rank** del leaderboard cacheado
  (`getUserRank`), sin consultar la BD en cada navegación. Las **stats** del
  usuario (`getUserStatsView`) también se derivan del leaderboard cacheado.
- **Datos por usuario** que sí van a BD: solo la **predicción propia** del usuario
  (consulta ligera por índice), siempre fresca.
- **Invalidación**: `revalidateTag(TAGS.matches | TAGS.leaderboard, "max")` en los
  endpoints admin (`sync`/`simulate`/`matches`). Para invalidación inmediata
  existe la variante `{ expire: 0 }` (ver comentario en `sync/route.ts`).

### Región (¡crítico para la latencia!)

Las funciones de Vercel deben correr **en la misma región que Supabase**, o cada
query cruza el planeta (~100 ms RTT) y la app se siente lenta. Supabase está en
`eu-west-1`, así que `vercel.json` fija `"regions": ["dub1"]` (Dublín). Si mueves
la BD a otra región, actualiza esto.

> Para un cron real durante el torneo: configura un **Vercel Cron** que llame a
> `POST /api/admin/sync` cada pocos minutos (importa resultados y recalcula).
> Tras desplegar, revisa el *hit rate* en **Vercel → Observability → Runtime Cache**.

> **Desarrollo local**: si tu red bloquea el puerto 6543 (pooler), las queries
> tardan ~5 s en *timeout*. Usa el puerto **5432** (directo) en `DATABASE_URL`
> para desarrollo; mantén **6543** en Vercel.

## Feature flags

Controlados por variables de entorno (`src/lib/features.ts`). Se evalúan en build:
cambiarlos requiere un nuevo despliegue.

| Variable                            | Por defecto | Efecto                                            |
| ----------------------------------- | ----------- | ------------------------------------------------- |
| `NEXT_PUBLIC_FEATURE_MINI_LEAGUES`  | `false`     | Activa/oculta toda la sección de mini-ligas (nav, página, crear/unirse, pestaña en clasificación) |

## Estado del proyecto

- **Fase 1 ✅** — auth, BD, login, shell.
- **Fase 2 ✅** — `/partidos` y `/predicciones` (tiempo real, deadline, comunidad).
- **Fase 3 ✅** — `/clasificacion`, mini-ligas, logros.
- **Extras ✅** — PWA instalable, datos reales del Mundial 2026, motor de
  recálculo, PPR + caché, `/estadisticas`, `/ajustes`, `/notificaciones`,
  Google OAuth (condicional).

Ver `PLAN.md` para el detalle completo.
