import type { FootballProvider, ProviderFixture } from "@/lib/providers/types";
import {
  resolveTeam,
  resolveGround,
  roundToStage,
  parseGroup,
  parseKickoff,
} from "@/lib/wc-data";

// Datos públicos del Mundial 2026 (sin clave). Calendario fiable; sin resultados
// en vivo (es un archivo versionado que la comunidad actualiza).
const SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

type RawMatch = {
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground: string;
  num?: number;
  score?: { ft?: [number, number] };
};

export const openfootballProvider: FootballProvider = {
  name: "openfootball",

  async getFixtures(): Promise<ProviderFixture[]> {
    const res = await fetch(SOURCE_URL, {
      // Cachea 1h cuando se ejecuta dentro de Next; ignorado en scripts.
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      throw new Error(`openfootball: HTTP ${res.status}`);
    }
    const data = (await res.json()) as { matches: RawMatch[] };

    const mapped = data.matches.map((m) => {
      const home = resolveTeam(m.team1);
      const away = resolveTeam(m.team2);
      const ground = resolveGround(m.ground);
      const ft = m.score?.ft;
      return {
        homeTeam: home.name,
        awayTeam: away.name,
        homeFlag: home.flag,
        awayFlag: away.flag,
        homeCrest: null,
        awayCrest: null,
        kickoffAt: parseKickoff(m.date, m.time),
        stage: roundToStage(m.round),
        group: parseGroup(m.group),
        stadium: ground.stadium,
        city: ground.city,
        homeScore: ft ? ft[0] : null,
        awayScore: ft ? ft[1] : null,
        status: (ft ? "FINISHED" : "UPCOMING") as ProviderFixture["status"],
        liveMinute: null,
      };
    });

    // Orden cronológico estable → matchNo determinista (1..104).
    mapped.sort(
      (a, b) =>
        a.kickoffAt.getTime() - b.kickoffAt.getTime() ||
        a.homeTeam.localeCompare(b.homeTeam),
    );
    return mapped.map((f, i) => ({
      ...f,
      matchNo: i + 1,
      externalId: `of-${i + 1}`,
    }));
  },
};
