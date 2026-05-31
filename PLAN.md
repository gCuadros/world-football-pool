# Plan de Construcción: Quiniela Mundial 2026

## Contexto
Construir desde cero una plataforma web de predicciones para el FIFA World Cup 2026 (64 partidos, en español). El repo parte vacío (solo el diseño `world-cup-pool.pen`, README y LICENSE). Node v22 disponible.

Se construye en **3 fases, cada una centrada en una página**, empezando por **Login** porque es donde entra en juego la base de datos.

### Decisiones tomadas
- **BD**: Supabase (Postgres hospedado) — usado SOLO como base de datos Postgres vía Prisma; la auth la maneja NextAuth, no Supabase Auth.
- **Auth**: NextAuth con credenciales (email/password, hash bcrypt). Google OAuth queda para después.
- **Color primario**: Azul `#0066B2` (consistente con el diseño `.pen`, NO el naranja del spec original).
- **Fuentes**: JetBrains Mono (headings/labels/números) + Geist (body). Dark mode con tokens CSS.

---

## Stack
Next.js 15 (App Router) + TypeScript · Tailwind CSS v4 + shadcn/ui · Prisma ORM → Supabase Postgres · NextAuth v5 (credentials) · Material Symbols Sharp · Deploy futuro en Vercel.

---

## FASE 1 — Login & Fundación  *(página: Login)*

Esta fase monta TODO lo que la BD necesita y entrega la página de login/registro funcional.

### 1.1 Scaffold
- `create-next-app` (TS, App Router, Tailwind v4, ESLint, alias `@/*`).
- Instalar shadcn/ui, Prisma, `@prisma/client`, `next-auth@beta`, `@auth/prisma-adapter`, `bcryptjs`, `zod`.
- Configurar fuentes (`next/font`): Geist + JetBrains Mono. Tokens CSS en `globals.css` (`--background`, `--card`, `--foreground`, `--muted`, `--primary: #0066B2`, etc.) con variantes light/dark.

### 1.2 Supabase + Prisma
- **Acción del usuario requerida**: crear proyecto en Supabase y dar las connection strings.
- `.env`: `DATABASE_URL` (pooler PgBouncer, puerto 6543, `?pgbouncer=true`) y `DIRECT_URL` (puerto 5432, para migraciones).
- `prisma/schema.prisma` con `directUrl`.

### 1.3 Schema completo (Prisma)
Definir todo el modelo de una vez para no re-migrar en cada fase:
- **User** (+ `passwordHash` para credentials, `avatar`, relaciones).
- Modelos NextAuth: **Account**, **Session**, **VerificationToken** (vía `@auth/prisma-adapter`, dejan listo Google OAuth futuro).
- **Match**: `homeTeam`, `awayTeam`, `kickoffAt` (UTC), `stage` enum, `group`, `homeScore?`, `awayScore?`, `status` enum, `stadium`.
- **Prediction**: `userId`, `matchId`, `homeScore`, `awayScore`, `points?`, timestamps. Índice único `(userId, matchId)`.
- **MiniLeague** (`inviteCode` único 6 chars) + **MiniLeagueMember**.
- **Achievement** (`type` enum, `unlockedAt`).
- Tabla materializada `LeaderboardSnapshot` (o vista) para ranking eficiente.
- `prisma migrate dev` contra Supabase.

### 1.4 Seed (`prisma/seed.ts`)
- Los **64 partidos** del Mundial 2026 (11 jun – 19 jul 2026, fechas/horas reales en UTC), 32 equipos en fase de grupos + placeholders eliminatorias, estadios reales (MetLife, SoFi, AT&T, Azteca, BC Place…).
- Unos **usuarios demo** con password hasheado para poder login y probar.

### 1.5 Auth (NextAuth v5, credentials)
- `auth.ts`: PrismaAdapter + CredentialsProvider (verifica email + bcrypt compare), estrategia **JWT** (obligatoria con credentials).
- `app/api/auth/[...nextauth]/route.ts`.
- `middleware.ts`: proteger rutas de la app; redirigir no autenticados a `/login`.
- Server action de **registro** (validación zod, hash bcrypt, crear User).

### 1.6 Página Login/Registro `/login`
- Diseño con tokens azules + fuentes del sistema. Logo "QUINIELA · Mundial 2026".
- Form email/password (login) + toggle a registro. Estados de error/carga. Redirige a `/partidos` al autenticar.

### 1.7 Shell autenticado (layout reutilizable)
- `app/(app)/layout.tsx`: **Sidebar 260px** (logo, nav: Partidos / Clasificación / Mis Predicciones / Mini-ligas / Estadísticas; sección CUENTA; footer con avatar+nombre+rank) + **Topbar** (breadcrumb, búsqueda, notificaciones). Estado activo resaltado. Base para Fases 2 y 3.
- Placeholder de `/partidos` para verificar el flujo completo de login → app.

### Verificación Fase 1
`npm run dev` → registrarse, login, ser redirigido al shell; rutas protegidas redirigen a `/login`; datos de partidos visibles en Supabase (`prisma studio`).

---

## FASE 2 — Partidos & Predicciones  *(núcleo del juego)*

Páginas `/partidos` y `/predicciones` + motor de puntuación y bloqueo por deadline (el corazón funcional).

### Lógica de negocio (servidor)
- **Bloqueo de predicciones**: `isLocked(match)` = `kickoffAt - now() <= 15 min`. Validado en server (PATCH/POST devuelven 403 si bloqueado), no solo cliente.
- **Motor de puntuación**: exacto = 3 pts, resultado correcto (H/D/A) = 1 pt, else 0. Recálculo al pasar `Match` a `FINISHED`.
- **Visibilidad social**: antes del kickoff solo el usuario ve su predicción; tras `LIVE`/`FINISHED` se expone distribución **agregada** (% por resultado + total votos), nunca individual por nombre; la propia con badge "Tu pred".

### API Routes
`GET /api/matches`, `GET /api/matches/[id]`, `POST /api/predictions`, `PATCH /api/predictions/[id]` (valida deadline), `GET /api/predictions/community/[matchId]` (solo post-kickoff), `GET /api/user/stats`.

### `/partidos`
Banner EN DIRECTO (badge rojo parpadeante), chips de filtro (Todos/En Directo/Grupos/Octavos/Cuartos/Semis/Final), grid 3 cols de tarjetas en vivo (minuto, banderas, marcador en primario, badge mi-predicción), secciones Fase de Grupos / Próximos, **countdown ámbar < 15 min** con barra de progreso, barra de stats del usuario.

### `/predicciones`
Header de usuario + chips de filtro + tarjetas en 3 estados: **A Cerrada/Terminada** (marcador final + comunidad colapsable con barras %), **B Cuenta regresiva** (banner ámbar + quick picks editables), **C Abierta** (inputs +/- por equipo, guardar/actualizar). Lista compacta + historial paginado.

### Tiempo real
Marcadores en vivo (polling 60s) + countdown cliente (`setInterval`). (WebSocket/Pusher opcional, diferible.)

### Verificación Fase 2
Crear/editar predicción antes del deadline; intento tras deadline → 403; marcar partido FINISHED → puntos recalculados; distribución comunidad solo visible post-kickoff.

---

## FASE 3 — Clasificación & Capa Social

Página `/clasificacion` + mini-ligas + logros.

### `/clasificacion`
Banner de ranking del usuario (gradiente, posición grande, pill tendencia, stats puntos/precisión/predicciones, "top X%"). Tabs General/Mini-liga/Semanal/Mensual. Podio top 3. Tabla paginada (POS/JUGADOR/PTS/PREC/PRED/RACHA) con fila propia resaltada y racha 🔥. Widget de logros.

### Mini-ligas y logros
- API: `GET /api/leaderboard`, `GET /api/leaderboard/mini-league/[id]`, `POST /api/mini-leagues`, `POST /api/mini-leagues/join`, `GET /api/user/achievements`.
- Logros: PERFECT_SCORE, STREAK_3/5/10, TOP_10, TOP_3, ALL_GROUP_STAGE, CHAMPION_CALL — desbloqueo al recalcular puntos.
- Leaderboard eficiente vía `LeaderboardSnapshot` (job/recálculo tras FINISHED).

### Diferibles (post-fase 3)
Notificaciones email/push (1h y 15min antes), Google OAuth, responsive mobile (sidebar drawer), skeleton loaders y empty states refinados, deploy Vercel.

### Verificación Fase 3
Crear mini-liga + unirse por código; ranking refleja puntos; logros se desbloquean; posición propia resaltada y paginación correcta.

---

## Notas transversales
- **Tiempo**: siempre UTC en BD; convertir al timezone del cliente al renderizar (es-ES, formato europeo).
- **Seguridad**: toda validación de deadline y visibilidad en el servidor.
- **Idioma**: 100% español.
- **Sistema de puntuación** (referencia):

```typescript
function calculatePoints(prediction, match): number {
  if (match.homeScore === null) return 0;            // partido no terminado
  if (prediction.homeScore === match.homeScore &&
      prediction.awayScore === match.awayScore) return 3;  // marcador exacto
  if (getResult(prediction) === getResult(match)) return 1; // resultado correcto
  return 0;
}
// getResult -> 'HOME' | 'DRAW' | 'AWAY'
```

---

## Orden de ejecución
Empezamos por **Fase 1 (Login)**. Las fases 2 y 3 se ejecutan en iteraciones posteriores, una página a la vez.
