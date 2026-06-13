import "server-only";

import { cacheLife, cacheTag } from "next/cache";

// Canal @Replay (FIFA): sube PREVIAS antes de cada partido y RESÚMENES al
// terminar. Se descubren sin API key por dos vías complementarias:
//  1. Feed RSS público (rápido, ~15 vídeos más recientes) → cubre lo reciente.
//  2. Búsqueda InnerTube (fallback) → encuentra una previa/resumen concreta
//     aunque ya haya salido de la ventana del RSS (el canal sube muchísimo).
const CHANNEL_ID = "UCM2DAYhfMPkGi7o6erYXiHg";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

// InnerTube: la API interna que usa la propia web de YouTube. Keyless (esta
// clave del cliente WEB es una constante pública) y devuelve JSON, no HTML:
// tolera peticiones de servidor (Vercel) mucho mejor que raspar las páginas,
// que YouTube sirve con muros de bot/consentimiento a IPs de datacenter.
const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}`;

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

// Estructura mínima de la respuesta InnerTube que nos interesa.
type VideoRenderer = {
  videoId?: string;
  title?: { runs?: { text?: string }[] };
  ownerText?: {
    runs?: { navigationEndpoint?: { browseEndpoint?: { browseId?: string } } }[];
  };
};

/** Recorre el JSON recolectando todos los videoRenderer (a cualquier nivel). */
function collectVideoRenderers(node: unknown, out: VideoRenderer[]): void {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if (obj.videoRenderer) out.push(obj.videoRenderer as VideoRenderer);
  for (const key in obj) collectVideoRenderers(obj[key], out);
}

/**
 * Busca en YouTube por texto (InnerTube) y devuelve los vídeos del canal
 * @Replay entre los resultados, filtrando por el browseId del canal para
 * descartar vídeos de otros canales. Resiliente: si falla, devuelve [].
 */
async function searchChannel(query: string): Promise<ReplayVideo[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("replay-videos");

  try {
    const res = await fetch(INNERTUBE_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
      body: JSON.stringify({
        context: {
          client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "es", gl: "US" },
        },
        query,
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const json: unknown = await res.json();

    const renderers: VideoRenderer[] = [];
    collectVideoRenderers(json, renderers);

    const out: ReplayVideo[] = [];
    const seen = new Set<string>();
    for (const v of renderers) {
      const videoId = v.videoId;
      const title = v.title?.runs?.[0]?.text;
      const browseId =
        v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;
      // Solo vídeos del canal @Replay (no de otros canales que salgan en la
      // búsqueda con los mismos equipos).
      if (videoId && title && browseId === CHANNEL_ID && !seen.has(videoId)) {
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
