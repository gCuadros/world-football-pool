import { cn } from "@/lib/utils";

/**
 * Escudo del equipo (API-Football). Si no hay escudo, cae al emoji de bandera;
 * si tampoco, a un placeholder. Usa <img> (escudos pequeños de dominio externo).
 */
export function TeamCrest({
  crest,
  flag,
  name,
  size = 24,
  className,
}: {
  crest: string | null;
  flag: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (crest) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={crest}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className={cn("object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cn("inline-block text-center leading-none", className)}
      style={{ width: size, fontSize: size * 0.8 }}
      aria-label={name}
    >
      {flag ?? "🏳️"}
    </span>
  );
}
