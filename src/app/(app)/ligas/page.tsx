import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Plus, ArrowRight, Trophy } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { getUserLeagues } from "@/lib/leaderboard";
import { Skeleton } from "@/components/ui/skeleton";
import { LigasActions } from "@/components/ligas/ligas-actions";

export const metadata = { title: "Mis Ligas · Quiniela Mundial 2026" };

export default function LigasPage() {
  return (
    <Suspense fallback={<LigasSkeleton />}>
      <LigasContent />
    </Suspense>
  );
}

async function LigasContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const leagues = await getUserLeagues(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-primary size-5" />
          <h1 className="text-xl font-bold">Mis Ligas</h1>
        </div>
      </div>

      {/* Ligas existentes */}
      {leagues.length > 0 && (
        <div className="space-y-3">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/liga/${league.id}`}
              className="border-border bg-card hover:bg-card/80 group flex items-center gap-4 rounded-xl border p-4 transition-colors"
            >
              <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Trophy className="text-primary size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{league.name}</p>
                <p className="text-muted-foreground text-sm">
                  {league.memberCount} {league.memberCount === 1 ? "miembro" : "miembros"}
                  {league.isOwner && (
                    <span className="text-primary ml-2 text-xs font-medium">Admin</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-mono text-xs">
                  {league.inviteCode}
                </span>
                <ArrowRight className="text-muted-foreground group-hover:text-foreground size-4 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Onboarding / Sin ligas */}
      {leagues.length === 0 && (
        <div className="border-border rounded-2xl border border-dashed p-8 text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl">
            <Users className="text-primary size-7" />
          </div>
          <h2 className="mb-2 text-lg font-bold">Únete a una liga para predecir</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Crea tu propia liga o únete a la de un amigo con un código de 6 caracteres.
            Las predicciones y la clasificación son por liga.
          </p>
        </div>
      )}

      {/* Acciones: unirse / crear */}
      <LigasActions />

      {leagues.length === 0 && (
        <p className="text-muted-foreground text-center text-xs">
          Puedes explorar{" "}
          <Link href="/resultados" className="text-primary underline">
            resultados
          </Link>{" "}
          y{" "}
          <Link href="/mundial" className="text-primary underline">
            el Mundial
          </Link>{" "}
          sin unirte a una liga.
        </p>
      )}
    </div>
  );
}

function LigasSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </div>
  );
}
