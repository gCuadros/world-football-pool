# Quiniela Mundial 2026

Plataforma web de predicciones para el FIFA World Cup 2026 (en español).
Predice los resultados de los 64 partidos, compite con amigos en mini-ligas,
sube en la clasificación y desbloquea logros.

**Puntuación**: marcador exacto = 3 puntos · resultado correcto (1X2) = 1 punto.
Las predicciones se cierran 15 minutos antes del inicio de cada partido.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Prisma ORM
sobre Supabase (PostgreSQL) · NextAuth v5 (credenciales).

## Arranque rápido

Necesitas un proyecto de Supabase y un `.env` configurado. Sigue
[`SETUP.md`](./SETUP.md):

```bash
cp .env.example .env      # rellena DATABASE_URL, DIRECT_URL, AUTH_SECRET
yarn                      # instala dependencias
yarn db:push              # crea las tablas
yarn db:seed              # 64 partidos + usuarios demo (password123)
yarn dev
```

## Estado

- **Fase 1 ✅** — auth, base de datos, seed, login y shell de la app.
- **Fase 2 ✅** — `/partidos` (en directo, filtros, countdown) y `/predicciones`
  (3 estados, edición, quick picks, distribución de la comunidad) + API REST.
- **Fase 3 ✅** — `/clasificacion` (banner, podio, tabla, tabs), `/mini-ligas`
  (crear/unirse con código, ranking interno) y `/logros` + API REST.

Las 3 pantallas del diseño y todas las funcionalidades del spec están implementadas.

Plan completo en [`PLAN.md`](./PLAN.md).
