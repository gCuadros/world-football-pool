import type { FootballProvider, ProviderFixture } from "@/lib/providers/types";
import { resolveTeam } from "@/lib/wc-data";
import type { Stage, MatchStatus } from "@prisma/client";

// API-Football v3 (cuenta directa de API-Sports). World Cup = league 1.
const BASE = "https://v3.football.api-sports.io";
const LEAGUE = 1;
// Temporada del Mundial. Configurable: los planes Free solo cubren 2022-2024;
// 2026 requiere un plan de pago.
const SEASON = Number(process.env.API_FOOTBALL_SEASON ?? 2026);

// Nombres de API-Football que difieren de los de openfootball (wc-data).
// Se normalizan antes de resolver nombre ES + bandera (fallback).
const AF_ALIAS: Record<string, string> = {
  "Korea Republic": "South Korea",
  "IR Iran": "Iran",
  Iran: "Iran",
  Czechia: "Czech Republic",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Congo DR": "DR Congo",
  "DR Congo": "DR Congo",
  Curacao: "Curaçao",
  "Cabo Verde": "Cape Verde",
  Turkey: "Turkey",
  "Türkiye": "Turkey",
  "USA": "USA",
  "United States": "USA",
  "Cape Verde Islands": "Cape Verde",
  "Cap-Vert": "Cape Verde",
};

function teamInfo(name: string) {
  return resolveTeam(AF_ALIAS[name] ?? name);
}

function mapStatus(short: string): MatchStatus {
  if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT", "SUSP"].includes(short))
    return "LIVE";
  if (["FT", "AET", "PEN"].includes(short)) return "FINISHED";
  return "UPCOMING"; // NS, TBD, PST, CANC, ABD, AWD, WO…
}

function mapRound(round: string): Stage {
  const r = round.toLowerCase();
  if (r.includes("group")) return "GROUP_STAGE";
  if (r.includes("round of 32")) return "ROUND_OF_32";
  if (r.includes("round of 16")) return "ROUND_OF_16";
  if (r.includes("quarter")) return "QUARTER_FINAL";
  if (r.includes("semi")) return "SEMI_FINAL";
  if (r.includes("3rd place") || r.includes("third")) return "THIRD_PLACE";
  if (r.includes("final")) return "FINAL";
  return "GROUP_STAGE";
}

type ApiResponse<T> = { response: T; errors?: unknown };

async function apiGet<T>(path: string): Promise<T> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY no configurada");

  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": key },
    // El cron controla la frecuencia; no cachear la llamada cruda.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`api-football: HTTP ${res.status}`);
  const json = (await res.json()) as ApiResponse<T>;
  const errs = json.errors;
  if (errs && (Array.isArray(errs) ? errs.length : Object.keys(errs).length)) {
    throw new Error(`api-football: ${JSON.stringify(errs)}`);
  }
  return json.response;
}

// ── Tipos mínimos de la respuesta que usamos ──────────────────────────────
type AfFixture = {
  fixture: {
    id: number;
    timestamp: number;
    status: { short: string; elapsed: number | null };
    venue: { name: string | null; city: string | null };
  };
  league: { round: string };
  teams: {
    home: { id: number; name: string; logo: string | null };
    away: { id: number; name: string; logo: string | null };
  };
  goals: { home: number | null; away: number | null };
};

type AfStandings = {
  league: { standings: { team: { id: number }; group: string }[][] };
}[];

/** Mapa equipo→grupo (A-L) desde standings (los fixtures no traen el grupo). */
async function getGroupMap(): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const resp = await apiGet<AfStandings>(
      `/standings?league=${LEAGUE}&season=${SEASON}`,
    );
    for (const group of resp[0]?.league?.standings ?? []) {
      for (const row of group) {
        const g = (row.group ?? "").replace(/group/i, "").trim();
        if (g) map.set(row.team.id, g);
      }
    }
  } catch {
    // Sin standings (p. ej. grupos aún sin sortear) → sin grupo.
  }
  return map;
}

function toFixture(item: AfFixture, group: string | null): Omit<ProviderFixture, "matchNo"> {
  const home = teamInfo(item.teams.home.name);
  const away = teamInfo(item.teams.away.name);
  const stage = mapRound(item.league.round);
  const status = mapStatus(item.fixture.status.short);
  return {
    externalId: String(item.fixture.id),
    homeTeam: home.name,
    awayTeam: away.name,
    homeFlag: home.flag,
    awayFlag: away.flag,
    homeCrest: item.teams.home.logo,
    awayCrest: item.teams.away.logo,
    kickoffAt: new Date(item.fixture.timestamp * 1000),
    stage,
    group: stage === "GROUP_STAGE" ? group : null,
    stadium: item.fixture.venue.name ?? "",
    city: item.fixture.venue.city ?? "",
    homeScore: item.goals.home,
    awayScore: item.goals.away,
    status,
    liveMinute: status === "LIVE" ? item.fixture.status.elapsed : null,
  };
}

export const apiFootballProvider: FootballProvider = {
  name: "api-football",

  async getFixtures(): Promise<ProviderFixture[]> {
    const [fixtures, groupMap] = await Promise.all([
      apiGet<AfFixture[]>(`/fixtures?league=${LEAGUE}&season=${SEASON}`),
      getGroupMap(),
    ]);

    const mapped = fixtures
      .map((item) => toFixture(item, groupMap.get(item.teams.home.id) ?? null))
      .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());

    return mapped.map((f, i) => ({ ...f, matchNo: i + 1 }));
  },
};

// ── Eventos de un partido (on-demand) ─────────────────────────────────────
export type MatchEvent = {
  minute: number | null;
  team: string;
  player: string | null;
  type: string; // Goal, Card, subst…
  detail: string; // Normal Goal, Yellow Card…
};

type AfEvent = {
  time: { elapsed: number | null; extra: number | null };
  team: { name: string };
  player: { name: string | null };
  type: string;
  detail: string;
};

// ── Standings (grupos) ────────────────────────────────────────────────────
export type GroupStanding = {
  group: string;
  teams: {
    rank: number;
    teamId: number;
    name: string;
    nameEs: string;
    logo: string | null;
    flag: string | null;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
    form: string | null;
  }[];
};

type AfStandingRow = {
  rank: number;
  team: { id: number; name: string; logo: string | null };
  group: string;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
  goalsDiff: number;
  points: number;
  form: string | null;
};

type AfStandingsResp = {
  league: { standings: AfStandingRow[][] };
}[];

export async function getApiFootballStandings(): Promise<GroupStanding[]> {
  const resp = await apiGet<AfStandingsResp>(
    `/standings?league=${LEAGUE}&season=${SEASON}`,
  );
  const groups = resp[0]?.league?.standings ?? [];
  return groups
    .filter((g) => g.length > 0)
    .map((g) => {
      const groupName = (g[0].group ?? "").replace(/group\s*/i, "").trim();
      return {
        group: groupName,
        teams: g.map((row) => {
          const info = teamInfo(row.team.name);
          return {
            rank: row.rank,
            teamId: row.team.id,
            name: row.team.name,
            nameEs: info.name,
            logo: row.team.logo,
            flag: info.flag,
            played: row.all.played,
            won: row.all.win,
            drawn: row.all.draw,
            lost: row.all.lose,
            goalsFor: row.all.goals.for,
            goalsAgainst: row.all.goals.against,
            goalDiff: row.goalsDiff,
            points: row.points,
            form: row.form,
          };
        }),
      };
    })
    .sort((a, b) => a.group.localeCompare(b.group));
}

// ── Top Scorers ───────────────────────────────────────────────────────────
export type TopScorer = {
  rank: number;
  playerName: string;
  teamName: string;
  teamLogo: string | null;
  teamFlag: string | null;
  photo: string | null;
  goals: number;
  assists: number;
  played: number;
};

type AfTopScorerRow = {
  player: { id: number; name: string; photo: string | null };
  statistics: {
    team: { id: number; name: string; logo: string | null };
    goals: { total: number | null; assists: number | null };
    games: { appearences: number | null };
  }[];
};

export async function getApiFootballTopScorers(): Promise<TopScorer[]> {
  const resp = await apiGet<AfTopScorerRow[]>(
    `/players/topscorers?league=${LEAGUE}&season=${SEASON}`,
  );
  return resp.slice(0, 20).map((row, i) => {
    const stat = row.statistics[0];
    const info = teamInfo(stat?.team?.name ?? "");
    return {
      rank: i + 1,
      playerName: row.player.name,
      teamName: info.name,
      teamLogo: stat?.team?.logo ?? null,
      teamFlag: info.flag,
      photo: row.player.photo,
      goals: stat?.goals?.total ?? 0,
      assists: stat?.goals?.assists ?? 0,
      played: stat?.games?.appearences ?? 0,
    };
  });
}

// ── Partidos en vivo (1 sola llamada, para detectar goles) ────────────────
export type LiveFixture = {
  externalId: string;
  homeScore: number;
  awayScore: number;
  minute: number | null;
  status: MatchStatus;
};

/**
 * Todos los partidos del Mundial en vivo AHORA, en UNA llamada (`live=all`).
 * Pensado para sondeo frecuente barato: devuelve marcador y minuto actuales.
 */
export async function getLiveFixtures(): Promise<LiveFixture[]> {
  const resp = await apiGet<AfFixture[]>(
    `/fixtures?league=${LEAGUE}&season=${SEASON}&live=all`,
  );
  return resp.map((item) => ({
    externalId: String(item.fixture.id),
    homeScore: item.goals.home ?? 0,
    awayScore: item.goals.away ?? 0,
    minute: item.fixture.status.elapsed,
    status: mapStatus(item.fixture.status.short),
  }));
}

/** Eventos (goles, tarjetas…) de un partido por su fixture id de API-Football. */
export async function getApiFootballEvents(
  externalId: string,
): Promise<MatchEvent[]> {
  const resp = await apiGet<AfEvent[]>(`/fixtures/events?fixture=${externalId}`);
  return resp.map((e) => ({
    minute:
      e.time.elapsed != null
        ? e.time.elapsed + (e.time.extra ?? 0)
        : null,
    team: teamInfo(e.team.name).name,
    player: e.player?.name ?? null,
    type: e.type,
    detail: e.detail,
  }));
}
