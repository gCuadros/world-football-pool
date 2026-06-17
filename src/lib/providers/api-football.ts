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
    home: { id: number; name: string; logo: string | null; winner: boolean | null };
    away: { id: number; name: string; logo: string | null; winner: boolean | null };
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
        // Solo "Group A".."Group L": la API añade pseudo-grupos como
        // "RANKING OF THIRD-PLACED TEAMS" que pisarían el grupo real.
        const m = /^group\s+([a-l])$/i.exec((row.group ?? "").trim());
        if (m) map.set(row.team.id, m[1].toUpperCase());
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
  const isKnockout = stage !== "GROUP_STAGE" && stage !== "FRIENDLY";
  const advanced: "HOME" | "AWAY" | null = isKnockout
    ? item.teams.home.winner ? "HOME" : item.teams.away.winner ? "AWAY" : null
    : null;
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
    liveMinute: status === "LIVE" ? liveMinuteOf(item.fixture.status) : null,
    advanced,
  };
}

/**
 * Minuto en vivo con sentinel de pausa: -1 = descanso (HT) o pausa del
 * alargue (BT). Sin él, el reloj se quedaba congelado en "45'" durante todo
 * el entretiempo. La UI lo traduce con formatLiveMinute.
 */
function liveMinuteOf(status: { short: string; elapsed: number | null }): number | null {
  if (status.short === "HT" || status.short === "BT") return -1;
  return status.elapsed;
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
  playerId: number | null;
  player: string | null;
  type: string; // Goal, Card, subst…
  detail: string; // Normal Goal, Yellow Card…
};

type AfEvent = {
  time: { elapsed: number | null; extra: number | null };
  team: { name: string };
  player: { id: number | null; name: string | null };
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
  // La API nombra los grupos "Group Stage - Group A" (antes "Group A"):
  // se ancla al final para sobrevivir a prefijos y descartar la tabla
  // agregada "Group Stage" que viene de propina.
  return groups
    .filter((g) => g.length > 0)
    .filter((g) => /group\s+[a-l]$/i.test((g[0].group ?? "").trim()))
    .map((g) => {
      const groupName = (g[0].group ?? "")
        .trim()
        .match(/group\s+([a-l])$/i)![1]
        .toUpperCase();
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
  playerId: number;
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
      playerId: row.player.id,
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

// ── Ficha de jugador ──────────────────────────────────────────────────────
export type PlayerProfile = {
  id: number;
  name: string;
  photo: string | null;
  age: number | null;
  nationality: string | null;
  position: string | null;
  teamName: string;
  teamLogo: string | null;
  teamFlag: string | null;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  rating: number | null;
};

// La API da la posición en inglés (completa en /players, abreviada en lineups).
const POSITION_ES: Record<string, string> = {
  Goalkeeper: "Portero",
  Defender: "Defensa",
  Midfielder: "Centrocampista",
  Attacker: "Delantero",
  G: "Portero",
  D: "Defensa",
  M: "Centrocampista",
  F: "Delantero",
};

type AfPlayerStat = {
  team: { name: string; logo: string | null };
  games: { appearences: number | null; minutes: number | null; position: string | null; rating: string | null };
  goals: { total: number | null; assists: number | null };
  cards: { yellow: number | null; red: number | null };
};
type AfPlayerResp = {
  player: {
    id: number;
    name: string;
    age: number | null;
    nationality: string | null;
    photo: string | null;
  };
  statistics: AfPlayerStat[];
}[];

/** Ficha de un jugador con sus stats en el torneo (league=Mundial, season). */
export async function getApiFootballPlayer(
  playerId: number,
): Promise<PlayerProfile | null> {
  const resp = await apiGet<AfPlayerResp>(
    `/players?id=${playerId}&league=${LEAGUE}&season=${SEASON}`,
  );
  const row = resp[0];
  if (!row) return null;

  // La API puede devolver varias líneas de stats; se suman los acumulables.
  const stats = row.statistics ?? [];
  const sum = (pick: (s: AfPlayerStat) => number | null | undefined) =>
    stats.reduce((acc, s) => acc + (pick(s) ?? 0), 0);
  const primary = stats[0];
  const info = teamInfo(primary?.team?.name ?? "");

  // Valoración: media de las líneas que la traen.
  const ratings = stats
    .map((s) => Number(s.games?.rating))
    .filter((n) => !Number.isNaN(n) && n > 0);
  const rating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : null;

  return {
    id: row.player.id,
    name: row.player.name,
    photo: row.player.photo,
    age: row.player.age,
    nationality: row.player.nationality,
    position: primary?.games?.position
      ? (POSITION_ES[primary.games.position] ?? primary.games.position)
      : null,
    teamName: info.name || primary?.team?.name || "—",
    teamLogo: primary?.team?.logo ?? null,
    teamFlag: info.flag,
    appearances: sum((s) => s.games?.appearences),
    minutes: sum((s) => s.games?.minutes),
    goals: sum((s) => s.goals?.total),
    assists: sum((s) => s.goals?.assists),
    yellow: sum((s) => s.cards?.yellow),
    red: sum((s) => s.cards?.red),
    rating: rating ? Math.round(rating * 10) / 10 : null,
  };
}

// ── Plantilla convocada ───────────────────────────────────────────────────
export type SquadPlayer = {
  id: number;
  name: string;
  number: number | null;
  position: string | null; // ya en español
  photo: string | null;
  age: number | null;
};

type AfSquad = {
  players: {
    id: number;
    name: string;
    age: number | null;
    number: number | null;
    position: string | null;
    photo: string | null;
  }[];
}[];

/** Plantilla convocada de una selección para el torneo (por id de equipo). */
export async function getApiFootballSquad(teamId: number): Promise<SquadPlayer[]> {
  const resp = await apiGet<AfSquad>(`/players/squads?team=${teamId}`);
  const players = resp[0]?.players ?? [];
  return players.map((p) => ({
    id: p.id,
    name: p.name,
    number: p.number,
    position: p.position ? (POSITION_ES[p.position] ?? p.position) : null,
    photo: p.photo,
    age: p.age,
  }));
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
 * Partidos en vivo AHORA para una o varias ligas. Hace una llamada por liga.
 * Por defecto solo el Mundial (liga 1); pasar `extraLeagues` para añadir más
 * (p. ej. [FRIENDLY_LEAGUE] durante la ventana de amistosos).
 */
export async function getLiveFixtures(
  extraLeagues: number[] = [],
): Promise<LiveFixture[]> {
  const leagues = [LEAGUE, ...extraLeagues];
  const responses = await Promise.all(
    leagues.map((l) =>
      apiGet<AfFixture[]>(`/fixtures?league=${l}&season=${SEASON}&live=all`),
    ),
  );
  return responses.flat().map((item) => ({
    externalId: String(item.fixture.id),
    homeScore: item.goals.home ?? 0,
    awayScore: item.goals.away ?? 0,
    minute: liveMinuteOf(item.fixture.status),
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
    playerId: e.player?.id ?? null,
    player: e.player?.name ?? null,
    type: e.type,
    detail: e.detail,
  }));
}

// ── Pronóstico (%) ────────────────────────────────────────────────────────
export type MatchPrediction = {
  percent: { home: number; draw: number; away: number };
  advice: string | null;
  winnerName: string | null;
  homeId: number;
  awayId: number;
};

type AfPrediction = {
  predictions: {
    winner: { id: number | null; name: string | null } | null;
    advice: string | null;
    percent: { home: string; draw: string; away: string };
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
};

function pct(v: string | null | undefined): number {
  return v ? Number(v.replace("%", "").trim()) || 0 : 0;
}

/** Pronóstico de API-Football para un partido. Incluye los IDs de equipo (para el h2h). */
export async function getApiFootballPrediction(
  externalId: string,
): Promise<MatchPrediction | null> {
  const resp = await apiGet<AfPrediction[]>(`/predictions?fixture=${externalId}`);
  const p = resp[0];
  if (!p) return null;
  return {
    percent: {
      home: pct(p.predictions.percent?.home),
      draw: pct(p.predictions.percent?.draw),
      away: pct(p.predictions.percent?.away),
    },
    advice: p.predictions.advice ?? null,
    winnerName: p.predictions.winner?.name ?? null,
    homeId: p.teams.home.id,
    awayId: p.teams.away.id,
  };
}

// ── Cuotas (1X2) ──────────────────────────────────────────────────────────
export type MatchOdds = {
  bookmaker: string;
  home: number | null;
  draw: number | null;
  away: number | null;
};

type AfOdds = {
  bookmakers: {
    name: string;
    bets: { name: string; values: { value: string; odd: string }[] }[];
  }[];
}[];

/** Cuotas 1X2 ("Match Winner") del primer bookmaker que las ofrezca. */
export async function getApiFootballOdds(
  externalId: string,
): Promise<MatchOdds | null> {
  const resp = await apiGet<AfOdds>(`/odds?fixture=${externalId}`);
  const num = (s: string | undefined): number | null =>
    s ? Number(s) || null : null;
  for (const row of resp) {
    for (const bk of row.bookmakers ?? []) {
      const bet = bk.bets?.find((b) => b.name === "Match Winner");
      if (!bet) continue;
      const odd = (v: string) => num(bet.values.find((x) => x.value === v)?.odd);
      const home = odd("Home");
      const draw = odd("Draw");
      const away = odd("Away");
      if (home || draw || away) return { bookmaker: bk.name, home, draw, away };
    }
  }
  return null;
}

// ── Alineaciones ──────────────────────────────────────────────────────────
export type LineupPlayer = {
  id: number | null;
  name: string;
  number: number | null;
  pos: string | null;
  grid: string | null;
};
export type TeamLineup = {
  team: string;
  teamLogo: string | null;
  teamFlag: string | null;
  formation: string | null;
  coach: string | null;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
};

type AfLineupPlayer = {
  player: { id: number | null; name: string | null; number: number | null; pos: string | null; grid: string | null };
};
type AfLineup = {
  team: { name: string; logo: string | null };
  formation: string | null;
  coach: { name: string | null } | null;
  startXI: AfLineupPlayer[];
  substitutes: AfLineupPlayer[];
};

export async function getApiFootballLineups(
  externalId: string,
): Promise<TeamLineup[]> {
  const resp = await apiGet<AfLineup[]>(`/fixtures/lineups?fixture=${externalId}`);
  const mapPlayer = (p: AfLineupPlayer): LineupPlayer => ({
    id: p.player.id ?? null,
    name: p.player.name ?? "—",
    number: p.player.number,
    pos: p.player.pos,
    grid: p.player.grid ?? null,
  });
  return resp.map((l) => {
    const info = teamInfo(l.team.name);
    return {
      team: info.name,
      teamLogo: l.team.logo,
      teamFlag: info.flag,
      formation: l.formation,
      coach: l.coach?.name ?? null,
      startXI: (l.startXI ?? []).map(mapPlayer),
      substitutes: (l.substitutes ?? []).map(mapPlayer),
    };
  });
}

// ── Estadísticas ──────────────────────────────────────────────────────────
const STAT_LABELS: Record<string, string> = {
  "Ball Possession": "Posesión",
  "Total Shots": "Tiros totales",
  "Shots on Goal": "Tiros a puerta",
  "Shots off Goal": "Tiros fuera",
  "Corner Kicks": "Córners",
  "Fouls": "Faltas",
  "Yellow Cards": "Tarjetas amarillas",
  "Red Cards": "Tarjetas rojas",
  "Offsides": "Fueras de juego",
  "Goalkeeper Saves": "Paradas",
  "Total passes": "Pases totales",
  "Passes accurate": "Pases acertados",
  "Passes %": "% de pases",
  "expected_goals": "Goles esperados (xG)",
};

export type TeamStats = {
  team: string;
  teamFlag: string | null;
  stats: { label: string; value: string | number | null }[];
};

type AfStatistics = {
  team: { name: string };
  statistics: { type: string; value: string | number | null }[];
};

export async function getApiFootballStatistics(
  externalId: string,
): Promise<TeamStats[]> {
  const resp = await apiGet<AfStatistics[]>(
    `/fixtures/statistics?fixture=${externalId}`,
  );
  return resp.map((s) => {
    const info = teamInfo(s.team.name);
    return {
      team: info.name,
      teamFlag: info.flag,
      stats: (s.statistics ?? []).map((st) => ({
        label: STAT_LABELS[st.type] ?? st.type,
        value: st.value,
      })),
    };
  });
}

// ── Head-to-head ──────────────────────────────────────────────────────────
export type H2HMatch = {
  date: string; // ISO
  home: string;
  homeFlag: string | null;
  away: string;
  awayFlag: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

export async function getApiFootballH2H(
  homeId: number,
  awayId: number,
  last = 5,
): Promise<H2HMatch[]> {
  const resp = await apiGet<AfFixture[]>(
    `/fixtures/headtohead?h2h=${homeId}-${awayId}&last=${last}`,
  );
  return resp.map((f) => {
    const h = teamInfo(f.teams.home.name);
    const a = teamInfo(f.teams.away.name);
    return {
      date: new Date(f.fixture.timestamp * 1000).toISOString(),
      home: h.name,
      homeFlag: h.flag,
      away: a.name,
      awayFlag: a.flag,
      homeScore: f.goals.home,
      awayScore: f.goals.away,
    };
  });
}
