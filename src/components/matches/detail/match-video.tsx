import { PlayCircle, YoutubeLogo } from "@phosphor-icons/react/dist/ssr";

/**
 * Tarjeta de vídeo oficial de FIFA (previa, resumen o entrevista). Abre el
 * vídeo en YouTube al pulsar, NO lo incrusta: FIFA bloquea el embedding de su
 * contenido en sitios de terceros (restricción de sindicación de Content ID),
 * así que un iframe muestra "vídeo no disponible". Abrir en YouTube además
 * deja elegir la pista de audio en español. Solo se carga la miniatura.
 */
export function MatchVideo({
  videoId,
  label,
  icon,
}: {
  videoId: string;
  label: string;
  icon: string;
}) {
  return (
    <section className="card-glass overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 p-4 pb-3">
        <span>{icon}</span>
        <h2 className="text-base font-bold">{label}</h2>
        <span className="text-muted-foreground ml-auto font-mono text-2xs tracking-wide uppercase">
          FIFA
        </span>
      </div>

      <a
        href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ver ${label.toLowerCase()} en YouTube`}
        className="group relative block aspect-video w-full bg-black"
      >
        {/* Miniatura de YouTube (sin next/image: dominio externo, sin optimizar). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
          alt={label}
          className="size-full object-cover"
          loading="lazy"
        />
        <span className="absolute inset-0 grid place-items-center bg-black/30 transition-colors group-hover:bg-black/15">
          <PlayCircle
            weight="fill"
            className="size-16 text-white/90 drop-shadow-lg transition-transform group-hover:scale-110"
          />
        </span>
        {/* Pista de que abre YouTube (no se reproduce dentro). */}
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-2xs font-medium text-white">
          <YoutubeLogo weight="fill" className="size-3.5 text-red-500" />
          YouTube
        </span>
      </a>
    </section>
  );
}
