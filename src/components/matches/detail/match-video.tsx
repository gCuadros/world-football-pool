"use client";

import { useState } from "react";
import { PlayCircle } from "@phosphor-icons/react";

/**
 * Vídeo (previa/resumen) embebido del canal @Replay. Facade: muestra solo la
 * miniatura y carga el iframe pesado al pulsar Play — la página de partido no
 * paga el coste del reproductor salvo que el usuario lo quiera. Se usa @Replay
 * (re-subidor) y NO el canal oficial de FIFA porque FIFA bloquea el embedding
 * de su contenido en sitios de terceros (error 150), y queremos reproducción
 * DENTRO de la app, sin salir a YouTube.
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
  const [playing, setPlaying] = useState(false);

  return (
    <section className="card-glass overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 p-4 pb-3">
        <span>{icon}</span>
        <h2 className="text-base font-bold">{label}</h2>
      </div>

      <div className="relative aspect-video w-full bg-black">
        {playing ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={label}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Reproducir ${label.toLowerCase()}`}
            className="group absolute inset-0 size-full"
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
          </button>
        )}
      </div>
    </section>
  );
}
