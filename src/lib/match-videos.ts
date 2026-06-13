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

// `params` de la pestaña "Vídeos" de un canal (constante de YouTube).
const VIDEOS_TAB_PARAMS = "EgZ2aWRlb3PyBgQKAjoA";
const INNERTUBE_CONTEXT = {
  client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "es", gl: "US" },
};

/** Extrae token de continuación (paginación) de una respuesta browse. */
function findContinuation(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const cmd = obj.continuationCommand as { token?: string } | undefined;
  if (cmd?.token) return cmd.token;
  for (const key in obj) {
    const t = findContinuation(obj[key]);
    if (t) return t;
  }
  return null;
}

/**
 * Recolecta los vídeos de una respuesta browse del canal. YouTube usa el
 * formato nuevo `lockupViewModel`: el id está en `contentId` y el título en
 * `lockupMetadataViewModel.title.content`.
 */
function collectLockups(node: unknown, out: ReplayVideo[]): void {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const lv = obj.lockupViewModel as
    | { contentId?: string; metadata?: unknown }
    | undefined;
  if (lv?.contentId) {
    let title: string | null = null;
    const findTitle = (x: unknown): void => {
      if (title || !x || typeof x !== "object") return;
      const o = x as Record<string, unknown>;
      const meta = o.lockupMetadataViewModel as
        | { title?: { content?: string } }
        | undefined;
      if (meta?.title?.content) {
        title = meta.title.content;
        return;
      }
      for (const k in o) findTitle(o[k]);
    };
    findTitle(lv);
    if (title) out.push({ videoId: lv.contentId, title });
  }
  for (const key in obj) collectLockups(obj[key], out);
}

async function browse(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(INNERTUBE_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
    body: JSON.stringify({ context: INNERTUBE_CONTEXT, ...body }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`browse ${res.status}`);
  return res.json();
}

/**
 * Vídeos recientes del canal @Replay vía la pestaña "Vídeos" de InnerTube
 * (la API interna de YouTube). A diferencia de la búsqueda, esto es el orden
 * cronológico real del canal — INDEPENDIENTE de la región del servidor (la
 * búsqueda general ordena distinto desde las IPs de Vercel y dejaba fuera al
 * canal). Pagina hasta `maxPages` (~30 vídeos por página). Resiliente: [].
 */
async function fetchChannelVideos(maxPages = 3): Promise<ReplayVideo[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("replay-videos");

  const out: ReplayVideo[] = [];
  const seen = new Set<string>();
  try {
    let token: string | null = null;
    for (let page = 0; page < maxPages; page++) {
      const json: unknown = await browse(
        token
          ? { continuation: token }
          : { browseId: CHANNEL_ID, params: VIDEOS_TAB_PARAMS },
      );
      const vids: ReplayVideo[] = [];
      collectLockups(json, vids);
      for (const v of vids) {
        if (!seen.has(v.videoId)) {
          seen.add(v.videoId);
          out.push(v);
        }
      }
      token = findContinuation(json);
      if (!token) break;
    }
  } catch {
    // best-effort: devuelve lo acumulado hasta el fallo.
  }
  return out;
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

  // Fallback: navegar la pestaña de vídeos del canal (más entradas que el RSS
  // y, a diferencia de la búsqueda, fiable desde la región de Vercel).
  const channel = await fetchChannelVideos();
  const fromChannel = channel.find((v) => matches(v, homeTeam, awayTeam, kind));
  return fromChannel?.videoId ?? null;
}
