# PLAN V2 — Ligas como núcleo + zona pública del Mundial

> ⚠️ **Diseño de referencia**: el diseño en **Pencil ya ha sido actualizado** con este
> rediseño v2. **Toda la implementación de UI debe ajustarse al último diseño `.pen`**
> (leerlo vía el MCP de Pencil antes de maquetar), no a la UI anterior.

## Contexto
La app evoluciona de "quiniela con predicción global" a una **app de referencia del
Mundial 2026** con dos mundos:

- **Zona pública (sin login)**: resultados en vivo, info del Mundial (grupos, partidos,
  fichas, goleadores) y noticias. Para captar usuarios / SEO / escalar.
- **Zona privada (login + liga)**: predicciones y clasificación **dentro de cada liga**.
  Nadie puede apostar sin pertenecer a una liga.

### Decisiones de producto (confirmadas por el usuario)
- **Predicción por liga**: marcador independiente en cada liga; **autorrelleno** con tu
  última predicción de ese partido en otra liga.
- **La liga es el espacio**: `/liga/[id]` (predices y ves SU clasificación; cambias entre
  tus ligas). **Solo clasificación por liga** (sin ranking global).
- **Onboarding / gate**: tras registro → unirse (código) o crear liga; sin liga no se
  predice (pero sí se explora la zona pública).
- **Noticias**: API-Football NO las ofrece → fuente externa (RSS sin clave). Fase posterior.
- Pensado para **escalar** tras el Mundial (estructura razonablemente genérica, sin
  sobre-ingeniería).

## Modelo de datos (Prisma) + `db push`
- **`Prediction`**: añadir `leagueId` (FK `MiniLeague`, `onDelete: Cascade`).
  Cambiar `@@unique([userId, matchId])` → `@@unique([userId, leagueId, matchId])`.
  La predicción pertenece a (usuario, liga, partido).
- **Clasificación por liga**: retirar el `LeaderboardSnapshot` global; el ranking de liga
  se calcula sobre las predicciones de esa liga (cacheado con `use cache` +
  `cacheTag(\`league-${id}\`)`). El recálculo al finalizar un partido repuntúa las
  predicciones de ese partido en **todas** las ligas.
- `MiniLeague` se mantiene como modelo; en UI se llama **"Liga"**. Reactivar (retirar el
  flag `NEXT_PUBLIC_FEATURE_MINI_LEAGUES`, ahora es el core).
- Logros: pasan a ser por liga (`(userId, leagueId, type)`) — revisar en su fase.
- Seed: ligas demo con predicciones por liga.

## Arquitectura de rutas (route groups)
- **`(public)`** — sin auth, cacheable/PPR + SEO:
  - `/` landing · `/resultados` (en vivo + calendario) · `/mundial` (grupos/standings,
    goleadores) · `/partido/[id]` (ficha: eventos, alineaciones, h2h, *predictions*) ·
    `/noticias` (fase posterior).
- **`(app)`** — login + liga:
  - `/ligas` (mis ligas + crear/unirse) · `/liga/[id]` (resumen, clasificación) ·
    `/liga/[id]/predicciones` · `/perfil` / `/ajustes`.
- **`src/proxy.ts`**: el callback `authorized` permite las rutas públicas y protege solo
  `(app)`.
- **Onboarding**: al entrar logueado sin ligas → redirige a `/ligas`.

## Reutilización (no reinventar)
- `savePrediction` (`src/app/(app)/predicciones/actions.ts`) → `savePrediction(leagueId,
  matchId, h, a)`: valida **membresía** + deadline (`isPredictionLocked`) + autorrelleno.
- `getMiniLeaguesForUser`, `createMiniLeague`, `joinMiniLeague` (`src/lib/leaderboard.ts`,
  `src/app/(app)/mini-ligas/actions.ts`) ya existen → base del espacio de liga.
- `getMatchesView` / `getMatchesBase` (`src/lib/queries.ts`) y `MatchCard` /
  `PredictionCard` se reusan; la predicción ahora se pide por liga.
- Motor `src/lib/recalculate.ts` → adaptar a ranking por liga.
- Datos de API-Football (escudos, standings, eventos, predictions, h2h, top scorers)
  alimentan la **zona pública** del Mundial.

## Fases de ejecución
1. **Pre**: cerrar verificación de API-Football **Pro** (que `season=2026` responde) +
   re-seed con escudos reales. (Pendiente de la sesión anterior.)
2. **Datos**: `Prediction.leagueId` + unique nuevo + recálculo/clasificación por liga + seed.
3. **Rutas**: separar `(public)` / `(app)`, ajustar `proxy.ts`, onboarding + gate.
4. **Espacio de liga** `/liga/[id]`: predicciones por liga (autorrelleno) + clasificación.
5. **Zona pública del Mundial**: `/resultados`, `/mundial` (standings/grupos + goleadores),
   ficha de partido enriquecida (eventos + predictions + h2h + lineups).
6. **Noticias** (RSS) + landing pública pulida.

> En cada fase de UI: **leer el diseño `.pen` actualizado vía MCP de Pencil** y maquetar
> conforme a él.

## Verificación
- Por fase: `tsc --noEmit` + `yarn lint` + `yarn build` (PPR `◐` en privado; `○` estático
  en público) verdes.
- E2E: usuario nuevo sin liga no puede predecir (gate) y sí ve `/resultados` / `/mundial`;
  crear/unirse a liga; predecir en dos ligas con marcadores distintos + autorrelleno;
  clasificación por liga correcta; finalizar partido (admin) repuntúa en todas las ligas.
- Zona pública accesible sin sesión (sin redirect a `/login`).

## Riesgos / notas
- Cambio de `unique` en `Prediction` → migración con `--accept-data-loss` y re-seed
  (datos demo).
- Reconciliar con lo ya hecho (PPR, caché, escudos, API-Football) sin romperlo.
- Alcance grande → ejecutar por fases en ramas separadas; el usuario mergea por PR.
- Mantener el modelo "Mundial 2026" desacoplado donde sea barato (de cara a escalar),
  sin sobre-ingeniar ahora.

## Prompt usado para actualizar Pencil (referencia)
> App de referencia del Mundial 2026 con **dos zonas**. Sistema de diseño: primario azul
> #0066B2, fondo #EBF3FF, sidebar #CCE2FF, tarjetas blancas, JetBrains Mono
> (números/labels/headings) + Geist (texto), escudos reales, bordes redondeados, dark mode.
> **Públicas (sin login)**: Landing (hero + CTA crear/unirse a liga) · Resultados (en vivo +
> calendario, filtros por fase) · Mundial (grupos A–L + goleadores) · Ficha de partido
> (eventos, alineaciones, h2h/forma, pronóstico %) · Noticias.
> **Privadas (login + liga)**: Onboarding (unirse con código / crear liga) · Mis ligas
> (tarjetas + selector) · Espacio de liga `/liga/[id]` (clasificación de miembros +
> predicciones de esa liga con stepper/quick-picks y autorrelleno) · Perfil/Ajustes.
> UX clave: nadie predice sin liga; predicciones y clasificación viven dentro de cada liga;
> lo genérico es público.
