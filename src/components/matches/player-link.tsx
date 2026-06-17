"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Enlace a la ficha de un jugador (/jugador/id). `stopPropagation` permite
 * usarlo dentro de tarjetas clicables (ClickCard) sin disparar su navegación.
 */
export function PlayerLink({
  playerId,
  className,
  children,
}: {
  playerId: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/jugador/${playerId}`}
      onClick={(e) => e.stopPropagation()}
      className={cn("transition-opacity hover:opacity-80", className)}
    >
      {children}
    </Link>
  );
}
