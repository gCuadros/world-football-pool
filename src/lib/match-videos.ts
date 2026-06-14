import "server-only";

import { cacheLife, cacheTag } from "next/cache";

// Canal @Replay (FIFA): sube PREVIAS antes de cada partido y RESÚMENES al
// terminar. Se descubren por dos vías complementarias:
//  1. Feed RSS público (gratis, sin clave, ~15 vídeos más recientes) → cubre
//     lo reciente (la mayoría de resúmenes y previas del día) sin gastar cuota.
//  2. YouTube Data API (fallback con clave) → encuentra una previa/resumen
//     concreta aunque ya haya salido de la ventana del RSS. Es la única vía
//     fiable desde las IPs de servidor de Vercel: YouTube sirve una respuesta
//     vacía anti-bot a su API interna (InnerTube) desde datacenters, pero la
//     Data API oficial funciona desde cualquier sitio.
const CHANNEL_ID = "UCM2DAYhfMPkGi7o6erYXiHg";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

export type MatchVideoKind = "previa" | "resumen";

type ReplayVideo = {
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
function matches(
  video: ReplayVideo,
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
 * Últimos vídeos del canal (Atom feed: ~15 más recientes). Resiliente: si el
 * feed falla, devuelve [].
 */
async function fetchReplayFeed(): Promise<ReplayVideo[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("replay-videos");

  try {
    const res = await fetch(FEED_URL, {
      headers: { "user-agent": "QuinielaMundial2026/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
    return entries
      .map((block) => {
        const videoId = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1];
        const title = block.match(/<title>([^<]*)<\/title>/i)?.[1];
        return videoId && title ? { videoId, title } : null;
      })
      .filter((v): v is ReplayVideo => v !== null);
  } catch {
    return [];
  }
}

/**
 * Busca dentro del canal con la YouTube Data API (search.list con channelId).
 * Oficial y fiable desde Vercel. Sin clave configurada → []. Resiliente: si
 * la petición falla (cuota, red), también []. Una búsqueda = 100 unidades de
 * cuota; con la caché de abajo, de sobra para un torneo.
 */
async function searchChannelDataApi(query: string): Promise<ReplayVideo[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("replay-videos");

  // La clave existe por contrato (getMatchVideo lo comprueba ANTES de llamar,
  // fuera de la caché: así un deploy sin clave nunca cachea un [] que luego se
  // sirviera obsoleto al añadirla).
  const key = process.env.YOUTUBE_API_KEY!;

  try {
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video` +
      `&channelId=${CHANNEL_ID}&maxResults=10&q=${encodeURIComponent(query)}&key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      items?: { id?: { videoId?: string }; snippet?: { title?: string } }[];
    };
    return (json.items ?? [])
      .map((it) => {
        const videoId = it.id?.videoId;
        const title = it.snippet?.title;
        return videoId && title ? { videoId, title } : null;
      })
      .filter((v): v is ReplayVideo => v !== null);
  } catch {
    return [];
  }
}

/**
 * Busca el vídeo (previa o resumen) del canal para un partido concreto,
 * emparejando por los DOS nombres de equipo en el título + la palabra clave.
 * Insensible al orden local/visitante. Devuelve el id de YouTube o null si
 * todavía no está disponible.
 *
 * Estrategia: primero el RSS (gratis); si el vídeo ya salió de esa ventana,
 * la Data API. Títulos del canal:
 *  - Resumen: "México 2 – 0 Sudáfrica | Resumen Copa Mundial de la FIFA 2026"
 *  - Previa:  "PREVIA GHANA - PANAMÁ | MUNDIAL 2026"
 */
export async function getMatchVideo(
  homeTeam: string,
  awayTeam: string,
  kind: MatchVideoKind,
): Promise<string | null> {
  const feed = await fetchReplayFeed();
  const fromFeed = feed.find((v) => matches(v, homeTeam, awayTeam, kind));
  if (fromFeed) return fromFeed.videoId;

  // Fallback con la Data API (solo si el RSS no lo tenía → ahorra cuota). La
  // comprobación de la clave va AQUÍ, fuera del bloque cacheado, para no
  // cachear un [] cuando la clave aún no está puesta.
  if (!process.env.YOUTUBE_API_KEY) return null;
  const keyword = kind === "previa" ? "PREVIA" : "Resumen";
  const results = await searchChannelDataApi(`${keyword} ${homeTeam} ${awayTeam}`);
  const fromApi = results.find((v) => matches(v, homeTeam, awayTeam, kind));
  return fromApi?.videoId ?? null;
}
