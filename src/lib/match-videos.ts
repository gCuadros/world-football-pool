import "server-only";

import { cacheLife, cacheTag } from "next/cache";

// Vídeos del partido, por tipo y fuente (los dos en español y, sobre todo,
// EMBEBIBLES dentro de la app — FIFA bloquea el embedding de su contenido):
//  - Resumen: canal oficial de DAZN España ("X vs Y (g-g) | Resumen y goles").
//  - Previa:  canal @Replay ("PREVIA X - Y | MUNDIAL 2026"); DAZN no sube previas.
// Se leen las playlists de "subidas" de cada canal (id del canal con UC→UU)
// vía la Data API: 1 unidad de cuota, region-independiente, 50 vídeos.
export type MatchVideoKind = "previa" | "resumen";

const PLAYLIST: Record<MatchVideoKind, string> = {
  previa: "UUM2DAYhfMPkGi7o6erYXiHg", // @Replay
  resumen: "UUK-mxP4hLap1t3dp4bPbSBg", // DAZN España
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

/** ¿Es este el vídeo del partido? Ambos equipos + palabra clave en el título. */
function matchesGame(
  video: YtVideo,
  homeTeam: string,
  awayTeam: string,
  kind: MatchVideoKind,
): boolean {
  const t = normalize(video.title);
  const keyword = kind === "previa" ? "PREVIA" : "RESUMEN";
  return (
    t.includes(keyword) &&
    t.includes(normalize(homeTeam)) &&
    t.includes(normalize(awayTeam))
  );
}

/**
 * Vídeos de una playlist (Data API, playlistItems). Argumento = id de
 * playlist, así que la caché tiene una entrada por playlist (previa/resumen),
 * compartida por todos los partidos: 1 llamada por ventana de caché. Resiliente:
 * cualquier fallo devuelve []. La clave existe por contrato (getMatchVideo la
 * comprueba ANTES, fuera de la caché, para no cachear un [] sin clave).
 */
async function fetchPlaylist(playlistId: string): Promise<YtVideo[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("match-videos");

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
 * Id de YouTube de la previa o el resumen del partido, o null si todavía no
 * está subido. Empareja por los DOS nombres de equipo (en español, como los
 * dos canales) + la palabra clave, insensible al orden local/visitante.
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
  const video = videos.find((v) => matchesGame(v, homeTeam, awayTeam, kind));
  return video?.videoId ?? null;
}
