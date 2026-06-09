"use client";

import Link from "next/link";

import { teamSlug } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Envuelve escudo+nombre de un equipo en un enlace a su página (/equipo/slug).
 * `stopPropagation` permite usarlo dentro de tarjetas clicables (ClickCard)
 * sin disparar la navegación de la tarjeta.
 */
export function TeamLink({
  name,
  className,
  children,
}: {
  name: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/equipo/${teamSlug(name)}`}
      onClick={(e) => e.stopPropagation()}
      className={cn("transition-opacity hover:opacity-80", className)}
    >
      {children}
    </Link>
  );
}
