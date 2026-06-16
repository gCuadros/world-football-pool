import "server-only";

import { cacheTag, cacheLife } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isPredictionLocked, MULTIPLIERS, scorePrediction } from "@/lib/scoring";
import { teamSlug } from "@/lib/utils";
import { TAGS } from "@/lib/cache-tags";
import {
  getApiFootballEvents,
  getApiFootballPrediction,
  getApiFootballLineups,
  getApiFootballStatistics,
  getApiFootballH2H,
  type MatchEvent,
  type MatchPrediction,
  type TeamLineup,
  type TeamStats,
  type H2HMatch,
} from "@/lib/providers/api-football";
import type { Stage, MatchStatus } from "@prisma/client";

export type PredictionVM = {
  homeScore: number;
  awayScore: number;
  points: number | null;
  exact: boolean;
  advancePick: "HOME" | "AWAY" | null;
};

export type MatchBase = {
  id: string;
  matchNo: number;
  externalId: string | null;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  homeCrest: string | null;
  awayCrest: string | null;
  kickoffAt: string; // ISO (UTC)
  stage: Stage;
  group: string | null;
  stadium: string;
  city: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  liveMinute: number | null;
  advanced: "HOME" | "AWAY" | null;
};

export type MatchVM = MatchBase & {
  prediction: PredictionVM | null;
  locked: boolean;
};

/** Solo letras A-L son grupos reales: la BD puede arrastrar pseudo-grupos
 *  de la API ("RANKING OF THIRD-PLACED TEAMS") de syncs anteriores. */
function cleanGroup(g: string | null): string | null {
  if (!g) return null;
  const t = g.trim().toUpperCase();
  return /^[A-L]$/.test(t) ? t : null;
}

/**
 * Marcador/estado/minuto de UN partido, SIN caché: el calendario general
 * (getMatchesBase) cachea "minutes" y, entre revalidaciones del cron, podía
 * quedarse atrás con un gol recién marcado. Para un partido en juego se lee
 * directo, así cada refresh (manual o AutoRefresh) trae lo último de la BD.
 * Resiliente: si la BD falla, null (se mantiene el dato cacheado).
 */
export async function getLiveMatchScore(matchId: string): Promise<{
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  liveMinute: number | null;
} | null> {
  try {
    return await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeScore: true, awayScore: true, status: true, liveMinute: true },
    });
  } catch {
    return null;
  }
}

/**
 * Calendario completo (compartido entre todos los usuarios) — CACHEADO (`use cache`).
 * Invalida con tag `matches` cuando se actualiza el calendario o resultados.
 */
export async function getMatchesBase(): Promise<MatchBase[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches);

  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "asc" },
  });
  // Fuera del torneo, fuera de la app — filtrado en el único punto del que
  // beben dashboard, predicciones, resultados y fichas:
  // 1. Amistosos: eran el banco de pruebas pre-Mundial; con el torneo en
  //    marcha ya no aportan (los registros siguen en BD, solo se ocultan).
  // 2. Fantasma: cancelados/aplazados por la API (CANC, PST…) quedan como
  //    UPCOMING en BD (el enum no modela cancelación). Si el kickoff pasó
  //    hace >3h y nunca arrancó, no se disputó: ni "pendiente" ni puntuable.
  const ghostCutoff = Date.now() - 3 * 60 * 60 * 1000;
  const played = matches.filter(
    (m) =>
      m.stage !== "FRIENDLY" &&
      !(m.status === "UPCOMING" && m.kickoffAt.getTime() < ghostCutoff),
  );
  return played.map((m) => ({
    id: m.id,
    matchNo: m.matchNo,
    externalId: m.externalId,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeFlag: m.homeFlag,
    awayFlag: m.awayFlag,
    homeCrest: m.homeCrest,
    awayCrest: m.awayCrest,
    kickoffAt: m.kickoffAt.toISOString(),
    stage: m.stage,
    group: cleanGroup(m.group),
    stadium: m.stadium,
    city: m.city,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    liveMinute: m.liveMinute,
    advanced: m.advanced,
  }));
}

/** Partidos con la predicción del usuario EN UNA LIGA CONCRETA. */
export async function getMatchesViewForLeague(
  userId: string,
  leagueId: string,
): Promise<MatchVM[]> {
  const now = new Date();
  const [base, predictions] = await Promise.all([
    getMatchesBase(),
    prisma.prediction.findMany({
      where: { userId, leagueId },
      select: { matchId: true, homeScore: true, awayScore: true, points: true, exact: true, advancePick: true },
    }),
  ]);

  // Los amistosos ya no existen en la app (getMatchesBase los filtra):
  // todas las ligas son del Mundial.
  const scoped = base;

  const byMatch = new Map(predictions.map((p) => [p.matchId, p]));

  return scoped.map((m) => {
    const p = byMatch.get(m.id);
    return {
      ...m,
      prediction: p
        ? { homeScore: p.homeScore, awayScore: p.awayScore, points: p.points, exact: p.exact, advancePick: p.advancePick }
        : null,
      locked: isPredictionLocked(new Date(m.kickoffAt), now),
    };
  });
}

/** Última predicción del usuario para un partido (en cualquier liga) — para autorrelleno. */
export async function getLastPredictionForMatch(
  userId: string,
  matchId: string,
): Promise<PredictionVM | null> {
  const pred = await prisma.prediction.findFirst({
    where: { userId, matchId },
    orderBy: { updatedAt: "desc" },
    select: { homeScore: true, awayScore: true, points: true, exact: true, advancePick: true },
  });
  return pred ?? null;
}

/** Lista de equipos (de la fase de grupos) con su bandera — CACHEADA (`use cache`). */
export async function getTeams(): Promise<
  { name: string; flag: string | null }[]
> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.matches);

  const matches = await prisma.match.findMany({
    where: { stage: "GROUP_STAGE" },
    select: { homeTeam: true, awayTeam: true, homeFlag: true, awayFlag: true },
  });
  const map = new Map<string, string | null>();
  for (const m of matches) {
    if (!map.has(m.homeTeam)) map.set(m.homeTeam, m.homeFlag);
    if (!map.has(m.awayTeam)) map.set(m.awayTeam, m.awayFlag);
  }
  return [...map.entries()]
    .map(([name, flag]) => ({ name, flag }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Distribución agregada de predicciones de la comunidad (solo tras el kickoff). */
export type CommunityDistribution = {
  total: number;
  scores: { label: string; count: number; pct: number }[];
  results: { home: number; draw: number; away: number };
};

export async function getCommunityDistribution(
  matchId: string,
): Promise<CommunityDistribution | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.matches, `community-${matchId}`);

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return null;
  if (match.status === "UPCOMING") return null;

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    select: { homeScore: true, awayScore: true },
  });

  const total = predictions.length;
  const scoreCounts = new Map<string, number>();
  let home = 0;
  let draw = 0;
  let away = 0;

  for (const p of predictions) {
    const label = `${p.homeScore}-${p.awayScore}`;
    scoreCounts.set(label, (scoreCounts.get(label) ?? 0) + 1);
    if (p.homeScore > p.awayScore) home++;
    else if (p.homeScore < p.awayScore) away++;
    else draw++;
  }

  const scores = [...scoreCounts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total,
    scores,
    results: {
      home: total > 0 ? Math.round((home / total) * 100) : 0,
      draw: total > 0 ? Math.round((draw / total) * 100) : 0,
      away: total > 0 ? Math.round((away / total) * 100) : 0,
    },
  };
}

/** Standings de los grupos del Mundial — CACHEADOS. */
export async function getWorldCupStandings() {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches);

  if (!process.env.API_FOOTBALL_KEY) return [];
  try {
    const { getApiFootballStandings } = await import(
      "@/lib/providers/api-football"
    );
    return await getApiFootballStandings();
  } catch {
    return [];
  }
}

/** Top Scorers del Mundial — CACHEADOS. */
export async function getWorldCupTopScorers() {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches);

  if (!process.env.API_FOOTBALL_KEY) return [];
  try {
    const { getApiFootballTopScorers } = await import(
      "@/lib/providers/api-football"
    );
    return await getApiFootballTopScorers();
  } catch {
    return [];
  }
}

/**
 * Eventos (goles/tarjetas) de un partido — CACHEADO (`use cache`).
 */
export async function getMatchEvents(
  externalId: string,
): Promise<MatchEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches, `events-${externalId}`);

  if (!process.env.API_FOOTBALL_KEY) return [];
  try {
    return await getApiFootballEvents(externalId);
  } catch {
    return [];
  }
}

/** Pronóstico (%) de un partido — CACHEADO. Incluye IDs de equipo para el h2h. */
export async function getMatchPrediction(
  externalId: string,
): Promise<MatchPrediction | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.matches, `detail-${externalId}`);

  if (!process.env.API_FOOTBALL_KEY) return null;
  try {
    return await getApiFootballPrediction(externalId);
  } catch {
    return null;
  }
}

/** Alineaciones de un partido — CACHEADO. */
export async function getMatchLineups(
  externalId: string,
): Promise<TeamLineup[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches, `detail-${externalId}`);

  if (!process.env.API_FOOTBALL_KEY) return [];
  try {
    return await getApiFootballLineups(externalId);
  } catch {
    return [];
  }
}

/** Estadísticas de un partido — CACHEADO. */
export async function getMatchStatistics(
  externalId: string,
): Promise<TeamStats[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches, `detail-${externalId}`);

  if (!process.env.API_FOOTBALL_KEY) return [];
  try {
    return await getApiFootballStatistics(externalId);
  } catch {
    return [];
  }
}

const KNOCKOUT_STAGE_ORDER = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
] as const;

type KnockoutStage = (typeof KNOCKOUT_STAGE_ORDER)[number];

export type KnockoutRound = {
  stage: KnockoutStage;
  label: string;
  multiplier: number;
  matches: MatchBase[];
};

const KNOCKOUT_LABELS: Record<KnockoutStage, string> = {
  ROUND_OF_32: "Dieciseisavos",
  ROUND_OF_16: "Octavos",
  QUARTER_FINAL: "Cuartos",
  SEMI_FINAL: "Semifinales",
  THIRD_PLACE: "3.er Puesto",
  FINAL: "Final",
};

/** Partidos de eliminatoria agrupados por ronda, en orden — CACHEADO (`use cache`). */
export async function getKnockoutMatches(): Promise<KnockoutRound[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches);

  // Resiliente a un Supabase dormido (free tier): corre en cada carga de
  // /mundial (pestaña Eliminatorias), así que un fallo de BD muestra el
  // estado vacío de esa pestaña en vez de tumbar toda la página.
  let rows: Awaited<ReturnType<typeof prisma.match.findMany>>;
  try {
    rows = await prisma.match.findMany({
      where: { stage: { in: [...KNOCKOUT_STAGE_ORDER] } },
      orderBy: { kickoffAt: "asc" },
    });
  } catch {
    return [];
  }

  const grouped = new Map<KnockoutStage, MatchBase[]>();
  for (const m of rows) {
    const stage = m.stage as KnockoutStage;
    const list = grouped.get(stage) ?? [];
    list.push({
      id: m.id,
      matchNo: m.matchNo,
      externalId: m.externalId,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeFlag: m.homeFlag,
      awayFlag: m.awayFlag,
      homeCrest: m.homeCrest,
      awayCrest: m.awayCrest,
      kickoffAt: m.kickoffAt.toISOString(),
      stage: m.stage,
      group: cleanGroup(m.group),
      stadium: m.stadium,
      city: m.city,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      liveMinute: m.liveMinute,
      advanced: m.advanced,
    });
    grouped.set(stage, list);
  }

  return KNOCKOUT_STAGE_ORDER
    .filter((s) => grouped.has(s))
    .map((s) => ({
      stage: s,
      label: KNOCKOUT_LABELS[s],
      multiplier: MULTIPLIERS[s],
      matches: grouped.get(s)!,
    }));
}

// ── Perfil público ────────────────────────────────────────────────────────────

export type PublicPrediction = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  kickoffAt: string;
  homeScore: number; // predicción
  awayScore: number; // predicción
  actualHome: number | null; // resultado real
  actualAway: number | null; // resultado real
  points: number | null;
  exact: boolean;
  stage: Stage;
  breakdown: import("@/lib/scoring").ScoreBreakdown | null;
};

export type PublicProfile = {
  id: string;
  name: string;
  avatar: string | null;
  coverImage: string | null;
  favoriteTeam: string | null;
  createdAt: string;
};

/**
 * Predicciones públicas de un usuario: solo partidos FINISHED (no revela
 * predicciones futuras que darían ventaja). Deduplica por partido (muestra
 * la predicción con más puntos si predijo en varias ligas).
 */
export async function getPublicPredictions(
  userId: string,
): Promise<{ profile: PublicProfile | null; predictions: PublicPrediction[] }> {
  const [user, preds] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatar: true, coverImage: true, favoriteTeam: true, createdAt: true },
    }),
    prisma.prediction.findMany({
      where: {
        userId,
        match: { status: "FINISHED" },
      },
      select: {
        matchId: true,
        homeScore: true,
        awayScore: true,
        points: true,
        exact: true,
        advancePick: true,
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            homeFlag: true,
            awayFlag: true,
            kickoffAt: true,
            homeScore: true,
            awayScore: true,
            stage: true,
            advanced: true,
          },
        },
      },
      orderBy: { match: { kickoffAt: "desc" } },
    }),
  ]);

  if (!user) return { profile: null, predictions: [] };

  // Deduplicar por matchId: quedarse con la predicción con más puntos.
  const byMatch = new Map<string, typeof preds[number]>();
  for (const p of preds) {
    const existing = byMatch.get(p.matchId);
    if (!existing || (p.points ?? 0) > (existing.points ?? 0)) {
      byMatch.set(p.matchId, p);
    }
  }

  const predictions: PublicPrediction[] = [...byMatch.values()]
    .slice(0, 40)
    .map((p) => ({
      matchId: p.matchId,
      homeTeam: p.match.homeTeam,
      awayTeam: p.match.awayTeam,
      homeFlag: p.match.homeFlag,
      awayFlag: p.match.awayFlag,
      kickoffAt: p.match.kickoffAt.toISOString(),
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      actualHome: p.match.homeScore,
      actualAway: p.match.awayScore,
      points: p.points,
      exact: p.exact,
      stage: p.match.stage,
      breakdown: scorePrediction(
        { homeScore: p.homeScore, awayScore: p.awayScore, advancePick: p.advancePick },
        { homeScore: p.match.homeScore, awayScore: p.match.awayScore, stage: p.match.stage, advanced: p.match.advanced },
      ),
    }));

  return {
    profile: {
      id: user.id,
      name: user.name ?? user.id,
      avatar: user.avatar,
      coverImage: user.coverImage,
      favoriteTeam: user.favoriteTeam,
      createdAt: user.createdAt.toISOString(),
    },
    predictions,
  };
}

// ── Páginas de equipo ─────────────────────────────────────────────────────────

export type TeamPageData = {
  name: string;
  slug: string;
  flag: string | null;
  crest: string | null;
  group: string | null;
  standing: import("@/lib/providers/api-football").GroupStanding["teams"][0] | null;
  /** Clasificación completa de su grupo (para la tabla con rivales). */
  groupTable: import("@/lib/providers/api-football").GroupStanding | null;
  /** Jugadores de la quiniela que lo tienen como equipo favorito. */
  fansCount: number;
  matches: MatchBase[];
  topScorers: import("@/lib/providers/api-football").TopScorer[];
};

export async function getTeamPage(slug: string): Promise<TeamPageData | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches);

  // Encontrar el nombre real del equipo desde cualquier partido en DB
  const allMatches = await prisma.match.findMany({
    select: {
      homeTeam: true, homeCrest: true, homeFlag: true,
      awayTeam: true, awayCrest: true, awayFlag: true,
    },
  });

  const teamMap = new Map<string, { crest: string | null; flag: string | null }>();
  for (const m of allMatches) {
    if (!teamMap.has(teamSlug(m.homeTeam))) {
      teamMap.set(teamSlug(m.homeTeam), { crest: m.homeCrest, flag: m.homeFlag });
    }
    if (!teamMap.has(teamSlug(m.awayTeam))) {
      teamMap.set(teamSlug(m.awayTeam), { crest: m.awayCrest, flag: m.awayFlag });
    }
  }

  // Reconstruct team name from slug by scanning all team names
  let teamName: string | null = null;
  for (const m of allMatches) {
    if (teamSlug(m.homeTeam) === slug) { teamName = m.homeTeam; break; }
    if (teamSlug(m.awayTeam) === slug) { teamName = m.awayTeam; break; }
  }
  if (!teamName) return null;

  const teamInfo = teamMap.get(slug) ?? { crest: null, flag: null };

  const [teamMatches, standings, allScorers, fansCount] = await Promise.all([
    prisma.match.findMany({
      where: { OR: [{ homeTeam: teamName }, { awayTeam: teamName }] },
      orderBy: { kickoffAt: "asc" },
    }),
    getWorldCupStandings(),
    getWorldCupTopScorers(),
    prisma.user.count({ where: { favoriteTeam: teamName } }),
  ]);

  let standing: TeamPageData["standing"] = null;
  let group: string | null = null;
  let groupTable: TeamPageData["groupTable"] = null;
  for (const g of standings) {
    const found = g.teams.find((t) => t.nameEs === teamName);
    if (found) { standing = found; group = g.group; groupTable = g; break; }
  }

  const topScorers = allScorers.filter((s) => s.teamName === teamName);

  return {
    name: teamName,
    slug,
    flag: teamInfo.flag,
    crest: standing?.logo ?? teamInfo.crest,
    group,
    standing,
    groupTable,
    fansCount,
    matches: teamMatches.map((m) => ({
      id: m.id,
      matchNo: m.matchNo,
      externalId: m.externalId,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeFlag: m.homeFlag,
      awayFlag: m.awayFlag,
      homeCrest: m.homeCrest,
      awayCrest: m.awayCrest,
      kickoffAt: m.kickoffAt.toISOString(),
      stage: m.stage,
      group: cleanGroup(m.group),
      stadium: m.stadium,
      city: m.city,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      liveMinute: m.liveMinute,
      advanced: m.advanced,
    })),
    topScorers,
  };
}

/** Head-to-head entre dos equipos (por IDs de API-Football) — CACHEADO. */
export async function getMatchH2H(
  homeId: number,
  awayId: number,
): Promise<H2HMatch[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`h2h-${homeId}-${awayId}`);

  if (!process.env.API_FOOTBALL_KEY) return [];
  try {
    return await getApiFootballH2H(homeId, awayId);
  } catch {
    return [];
  }
}
