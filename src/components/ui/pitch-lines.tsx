import { cn } from "@/lib/utils";

/**
 * Líneas de campo de fútbol (vista cenital) como adorno de fondo para paneles
 * hero: línea de medio campo, círculo central y áreas. Trazo blanco muy tenue;
 * el contenedor debe ser `relative` y el texto ir por encima.
 */
export function PitchLines({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      className={cn(
        "pointer-events-none absolute inset-0 size-full text-white/[0.07]",
        className,
      )}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        {/* Línea de medio campo + círculo central */}
        <line x1="200" y1="-10" x2="200" y2="250" />
        <circle cx="200" cy="120" r="46" />
        <circle cx="200" cy="120" r="3" fill="currentColor" stroke="none" />
        {/* Área izquierda */}
        <rect x="-20" y="50" width="70" height="140" />
        <path d="M50 86 A 46 46 0 0 1 50 154" />
        {/* Área derecha */}
        <rect x="350" y="50" width="70" height="140" />
        <path d="M350 154 A 46 46 0 0 1 350 86" />
      </g>
    </svg>
  );
}
