"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Tarjeta clicable que navega con router.push en lugar de <Link>: permite
 * tener enlaces reales dentro (p. ej. TeamLink) sin anidar <a> dentro de <a>,
 * que es HTML inválido y rompe la hidratación.
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
  return (
    <div
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
