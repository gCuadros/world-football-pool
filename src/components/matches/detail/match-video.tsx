"use client";

import { useState } from "react";
import { PlayCircle } from "@phosphor-icons/react";

import type { MatchVideoKind } from "@/lib/match-videos";

const META: Record<MatchVideoKind, { label: string; icon: string }> = {
  previa: { label: "Previa del partido", icon: "🎬" },
  resumen: { label: "Resumen del partido", icon: "📺" },
};

/**
 * Vídeo oficial de FIFA (previa/resumen) embebido. Facade: muestra solo la
 * miniatura de YouTube y carga el iframe pesado al pulsar Play — la página de
 * partido no paga el coste del reproductor salvo que el usuario lo quiera.
 */
export function MatchVideo({
  videoId,
  kind,
}: {
  videoId: string;
  kind: MatchVideoKind;
}) {
  const [playing, setPlaying] = useState(false);
  const { label, icon } = META[kind];

  return (
    <section className="card-glass overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 p-4 pb-3">
        <span>{icon}</span>
        <h2 className="text-base font-bold">{label}</h2>
        <span className="text-muted-foreground ml-auto font-mono text-2xs tracking-wide uppercase">
          FIFA
        </span>
      </div>

      <div className="relative aspect-video w-full bg-black">
        {playing ? (
          <iframe
            className="absolute inset-0 size-full"
            // hl=es: pide la pista de audio en español en los vídeos con
            // multi-audio de FIFA (la previa trae inglés por defecto).
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&hl=es&cc_lang_pref=es`}
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
