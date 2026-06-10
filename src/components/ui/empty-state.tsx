import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

/**
 * Estado vacío con personalidad: icono en chip degradado, título, descripción
 * y CTA opcional. Sustituye a los bloques "borde discontinuo + texto gris".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col items-center rounded-2xl border border-dashed p-8 text-center",
        className,
      )}
    >
      <div className="bg-primary-gradient shadow-primary/30 mb-3 flex size-12 items-center justify-center rounded-2xl text-white shadow-md">
        <Icon className="size-6" />
      </div>
      <p className="font-semibold">{title}</p>
      {description ? (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          className="text-primary mt-4 flex items-center gap-1.5 text-sm font-semibold hover:underline"
        >
          {action.label}
          <ArrowRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
