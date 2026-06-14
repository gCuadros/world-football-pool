import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { ENGLISH_NAME } from "@/lib/wc-data";

// Vídeos oficiales del canal de FIFA (@fifa) para el Mundial 2026. FIFA tiene
// playlists DEDICADAS de previas y de highlights, así que leemos esas dos
// directamente (vía Data API, playlistItems): solo traen partidos, sin ruido,
// y no hace falta filtrar por palabra clave. Region-independiente y 1 unidad
// de cuota por playlist (cacheada y compartida por toda la app).
export type MatchVideoKind = "previa" | "resumen";

const PLAYLIST: Record<MatchVideoKind, string> = {
  previa: "PLOKG1WmvypGc", // "Match Previews | FIFA World Cup 2026™"
  resumen: "PLBRLtDhTHh5o", // "Match Highlights | FIFA World Cup 2026™"
};

type YtVideo = {
  videoId: string;
  title: string;
};

/** Normaliza para comparar: sin acentos, mayúsculas, espacios colapsados. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Nombres que FIFA escribe distinto al nombre EN de wc-data. Solo los que
// difieren; el resto (Spain, Mexico, Japan…) coinciden tal cual.
const FIFA_ALIASES: Record<string, string[]> = {
  "Ivory Coast": ["Cote d'Ivoire"],
  "South Korea": ["Korea Republic"],
  "Czech Republic": ["Czechia"],
  "Bosnia & Herzegovina": ["Bosnia and Herzegovina"],
  Turkey: ["Türkiye"],
  USA: ["United States"],
};

/** Formas (normalizadas) en inglés con que FIFA puede nombrar al equipo. */
function teamAliases(spanishName: string): string[] {
  const en = ENGLISH_NAME[spanishName] ?? spanishName;
  return [en, ...(FIFA_ALIASES[en] ?? [])].map(normalize);
}

/** ¿El título nombra a AMBOS equipos? (la playlist ya filtra el tipo). */
function matchesGame(video: YtVideo, homeTeam: string, awayTeam: string): boolean {
  const t = normalize(video.title);
  return (
    teamAliases(homeTeam).some((a) => t.includes(a)) &&
    teamAliases(awayTeam).some((a) => t.includes(a))
  );
}

/**
 * Vídeos de una playlist (Data API). Argumento = id de playlist, así que la
 * caché tiene una entrada por playlist (previas/highlights), compartida por
 * todos los partidos. Resiliente: cualquier fallo devuelve []. La clave existe
 * por contrato (getMatchVideo la comprueba ANTES, fuera de la caché).
 */
async function fetchPlaylist(playlistId: string): Promise<YtVideo[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("fifa-videos");

  try {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet` +
      `&playlistId=${playlistId}&maxResults=50&key=${process.env.YOUTUBE_API_KEY!}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      items?: { snippet?: { title?: string; resourceId?: { videoId?: string } } }[];
    };
    return (json.items ?? [])
      .map((it) => {
        const videoId = it.snippet?.resourceId?.videoId;
        const title = it.snippet?.title;
        return videoId && title ? { videoId, title } : null;
      })
      .filter((v): v is YtVideo => v !== null);
  } catch {
    return [];
  }
}

/**
 * Id de YouTube de la previa o el resumen oficial del partido, o null si FIFA
 * todavía no lo ha subido. Empareja por los DOS nombres de equipo en el título
 * (FIFA los escribe en inglés), insensible al orden local/visitante. Formatos:
 *  - Previa:    "Match Preview: Mexico vs South Africa | FIFA World Cup 2026™"
 *  - Highlights:"Highlights | USA 4-1 Paraguay | FIFA World Cup 2026™"
 */
export async function getMatchVideo(
  homeTeam: string,
  awayTeam: string,
  kind: MatchVideoKind,
): Promise<string | null> {
  // Sin clave no hay descubrimiento de vídeos: la sección no se muestra. El
  // check va FUERA de la caché para no cachear un [] sin clave.
  if (!process.env.YOUTUBE_API_KEY) return null;

  const videos = await fetchPlaylist(PLAYLIST[kind]);
  const video = videos.find((v) => matchesGame(v, homeTeam, awayTeam));
  return video?.videoId ?? null;
}
