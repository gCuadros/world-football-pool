import "server-only";

import { cacheLife, cacheTag } from "next/cache";

// Canal @Replay (FIFA): sube PREVIAS antes de cada partido y RESÚMENES al
// terminar. Se descubren sin API key por dos vías complementarias:
//  1. Feed RSS público (rápido, ~15 vídeos más recientes) → cubre lo reciente.
//  2. Búsqueda del canal (fallback) → encuentra una previa/resumen concreta
//     aunque ya haya salido de la ventana del RSS (el canal sube muchísimo).
const CHANNEL_ID = "UCM2DAYhfMPkGi7o6erYXiHg";
const CHANNEL_HANDLE = "@replay";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

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
 * Busca en el canal por texto y devuelve los vídeos (id + título) de los
 * resultados. Parsea el `ytInitialData` incrustado en la página de búsqueda
 * del canal (sin API key). Resiliente: si falla, devuelve [].
 */
async function searchChannel(query: string): Promise<ReplayVideo[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("replay-videos");

  try {
    const url = `https://www.youtube.com/${CHANNEL_HANDLE}/search?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        "accept-language": "es-ES,es;q=0.9",
        // Cookie de consentimiento: salta el muro que YouTube sirve a IPs de
        // servidor (Vercel) y que devolvería un HTML sin resultados.
        cookie: "SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwMTA5LjA4X3AwGgJlbiACGgYIgMHbrAY; CONSENT=YES+",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const out: ReplayVideo[] = [];
    const seen = new Set<string>();
    // Cada resultado de vídeo es un bloque "videoRenderer":{...} con su id y,
    // más adelante, su título en title.runs[0].text.
    for (const part of html.split('"videoRenderer":').slice(1)) {
      const videoId = part.match(/^\{"videoId":"([A-Za-z0-9_-]{11})"/)?.[1];
      const title = part.match(/"title":\{"runs":\[\{"text":"([^"]+)"/)?.[1];
      if (videoId && title && !seen.has(videoId)) {
        seen.add(videoId);
        out.push({ videoId, title });
      }
    }
    return out;
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
 * Estrategia: primero el RSS (rápido); si el vídeo ya salió de esa ventana,
 * se busca en el canal. Títulos del canal:
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

  // Fallback: búsqueda dirigida en el canal.
  const keyword = kind === "previa" ? "PREVIA" : "Resumen";
  const results = await searchChannel(`${keyword} ${homeTeam} ${awayTeam}`);
  const fromSearch = results.find((v) => matches(v, homeTeam, awayTeam, kind));
  return fromSearch?.videoId ?? null;
}
