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
