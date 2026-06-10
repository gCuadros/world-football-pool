"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Tarjeta clicable que navega con router.push en lugar de <Link>: permite
 * tener enlaces reales dentro (p. ej. TeamLink) sin anidar <a> dentro de <a>,
 * que es HTML inválido y rompe la hidratación.
 *
 * Prefetch como <Link>: al entrar la tarjeta en el viewport se precarga la
 * ruta (shell estático), para que el push pinte al instante en vez de esperar
 * al servidor en frío — era la causa del flash al abrir partido/equipo.
 */
export function ClickCard({
  href,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        router.prefetch(href);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [href, router]);

  return (
    <div
      ref={ref}
      role="link"
      tabIndex={0}
      aria-label={ariaLabel}
      className={cn("cursor-pointer", className)}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
    >
      {children}
    </div>
  );
}
