"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { setFavoriteLeague } from "@/app/(app)/mini-ligas/actions";
import { cn } from "@/lib/utils";

/**
 * Estrella para marcar una liga como favorita (la que aparece en la barra
 * inferior). Si ya es la favorita, se muestra rellena y no hace nada.
 */
export function FavoriteStar({
  leagueId,
  isFavorite,
}: {
  leagueId: string;
  isFavorite: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle() {
    if (isFavorite) return;
    start(async () => {
      const res = await setFavoriteLeague(leagueId);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo marcar como favorita");
        return;
      }
      toast.success("Liga favorita actualizada");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || isFavorite}
      aria-label={isFavorite ? "Liga favorita" : "Marcar como favorita"}
      aria-pressed={isFavorite}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
        isFavorite
          ? "text-amber-500"
          : "text-muted-foreground hover:text-amber-500 hover:bg-muted",
      )}
    >
      <Star className={cn("size-4", isFavorite && "fill-amber-500")} />
    </button>
  );
}
