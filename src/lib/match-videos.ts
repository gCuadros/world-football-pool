import "server-only";

import { cacheLife, cacheTag } from "next/cache";

// Vídeos del canal @Replay (FIFA): sube PREVIAS antes de cada partido y
// RESÚMENES al terminar. Se descubren con la YouTube Data API, leyendo la
// playlist de "subidas" del canal (su id es el del canal con UC→UU).
//
// Por qué playlistItems y no search.list ni el RSS:
//  - search.list es una búsqueda con ranking SESGADO POR REGIÓN (infiere país
//    por la IP del que llama): desde las IPs de Vercel devolvía 0 resultados.
//  - playlistItems NO es una búsqueda: es la lista literal de subidas, idéntica
//    desde cualquier región y fiable desde servidor. Cuesta 1 unidad de cuota.
//  - El RSS (keyless) solo daba 15 vídeos y nada de esto resolvía mejor.
const CHANNEL_ID = "UCM2DAYhfMPkGi7o6erYXiHg";
const UPLOADS_PLAYLIST = `UU${CHANNEL_ID.slice(2)}`;

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
function matchesGame(
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
 * Últimas 50 subidas del canal (Data API, playlistItems). Sin argumentos: la
 * caché es UNA entrada global compartida por todos los partidos, así que es
 * 1 sola llamada a la API por ventana de caché para toda la app. Resiliente:
 * cualquier fallo (red, cuota) devuelve []. La clave existe por contrato
 * (getMatchVideo la comprueba ANTES, fuera de la caché, para no cachear un
 * [] espurio cuando aún no está configurada).
 */
async function fetchChannelUploads(): Promise<ReplayVideo[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("replay-videos");

  try {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet` +
      `&playlistId=${UPLOADS_PLAYLIST}&maxResults=50&key=${process.env.YOUTUBE_API_KEY!}`;
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
      .filter((v): v is ReplayVideo => v !== null);
  } catch {
    return [];
  }
}

/**
 * Id de YouTube de la previa o el resumen del partido, o null si todavía no
 * está subido. Empareja por los DOS nombres de equipo + la palabra clave en
 * el título, insensible al orden local/visitante. Títulos del canal:
 *  - Resumen: "México 2 – 0 Sudáfrica | Resumen Copa Mundial de la FIFA 2026"
 *  - Previa:  "PREVIA GHANA - PANAMÁ | MUNDIAL 2026"
 */
export async function getMatchVideo(
  homeTeam: string,
  awayTeam: string,
  kind: MatchVideoKind,
): Promise<string | null> {
  // Sin clave no hay descubrimiento de vídeos: la sección simplemente no se
  // muestra. El check va FUERA de la caché para no cachear un [] sin clave.
  if (!process.env.YOUTUBE_API_KEY) return null;

  const uploads = await fetchChannelUploads();
  const video = uploads.find((v) => matchesGame(v, homeTeam, awayTeam, kind));
  return video?.videoId ?? null;
}
