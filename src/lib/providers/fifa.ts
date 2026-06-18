import "server-only";

// API oficial de la FIFA (pública). El calendario del Mundial 2026 trae datos
// oficiales que API-Football no da: asistencia, árbitro, estadio/nombres
// oficiales. Se une al partido de la BD por `matchNo` === `MatchNumber` (el
// número oficial de partido, verificado: nº1 = México-Sudáfrica, nº4 = USA-PAR).
const FIFA_BASE = "https://api.fifa.com/api/v3";
const FIFA_SEASON = process.env.FIFA_SEASON ?? "285023"; // Copa Mundial 2026

export type FifaMatchInfo = {
  idMatch: string | null; // IdMatch FIFA (para unir con las stats físicas)
  attendance: number | null;
  referee: string | null;
  refereeCountry: string | null; // código (BRA, NED…)
  stadium: string | null;
  city: string | null;
};

type FifaLocalized = { Locale: string; Description: string }[];

function loc(arr: FifaLocalized | undefined | null): string | null {
  if (!arr || arr.length === 0) return null;
  const es = arr.find((x) => x.Locale?.toLowerCase().startsWith("es"));
  return (es ?? arr[0]).Description ?? null;
}

type FifaMatch = {
  MatchNumber: number | null;
  IdMatch: string | null;
  Attendance: string | null;
  Stadium?: { Name?: FifaLocalized; CityName?: FifaLocalized } | null;
  Officials?: {
    OfficialType: number;
    IdCountry: string | null;
    Name?: FifaLocalized;
  }[];
};

/**
 * Calendario oficial del Mundial: devuelve un mapa MatchNumber → datos FIFA.
 * Una sola llamada (count=500 cubre los 104 partidos). El llamador la cachea.
 */
export async function getFifaWorldCupMatches(): Promise<
  Record<string, FifaMatchInfo>
> {
  const res = await fetch(
    `${FIFA_BASE}/calendar/matches?language=es&count=500&idSeason=${FIFA_SEASON}`,
    {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`fifa: HTTP ${res.status}`);
  const json = (await res.json()) as { Results?: FifaMatch[] };

  const out: Record<string, FifaMatchInfo> = {};
  for (const m of json.Results ?? []) {
    if (m.MatchNumber == null) continue;
    const ref = (m.Officials ?? []).find((o) => o.OfficialType === 1); // árbitro
    out[String(m.MatchNumber)] = {
      idMatch: m.IdMatch ?? null,
      attendance: m.Attendance ? Number(m.Attendance) || null : null,
      referee: loc(ref?.Name),
      refereeCountry: ref?.IdCountry ?? null,
      stadium: loc(m.Stadium?.Name),
      city: loc(m.Stadium?.CityName),
    };
  }
  return out;
}
