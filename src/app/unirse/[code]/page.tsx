import { Suspense } from "react";
import Link from "next/link";
import { Trophy, Users, ArrowRight, LogIn } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { JoinLeagueButton } from "@/components/ligas/join-league-button";

export const metadata = { title: "Invitación a una liga" };

export default function UnirsePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <UnirseContent params={params} />
    </Suspense>
  );
}

async function UnirseContent({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const inviteCode = code.toUpperCase();

  const league = await prisma.miniLeague.findUnique({
    where: { inviteCode },
    select: { id: true, name: true },
  });

  return (
    <div className="from-primary/10 to-background flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b px-4 py-10">
      <div className="border-border bg-card w-full max-w-md space-y-6 rounded-2xl border p-8 text-center shadow-sm">
        <span className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-3xs font-bold tracking-[0.15em]">
          <Trophy className="size-3.5" />
          QUINIELA · MUNDIAL 2026
        </span>

        {!league ? (
          <>
            <h1 className="font-mono text-2xl font-bold">Invitación no válida</h1>
            <p className="text-muted-foreground text-sm">
              El código <span className="font-mono font-bold">{inviteCode}</span> no
              corresponde a ninguna liga.
            </p>
            <Link
              href="/ligas"
              className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            >
              Ir a mis ligas
              <ArrowRight className="size-4" />
            </Link>
          </>
        ) : (
          <Invitation leagueId={league.id} leagueName={league.name} code={inviteCode} />
        )}
      </div>
    </div>
  );
}

async function Invitation({
  leagueId,
  leagueName,
  code,
}: {
  leagueId: string;
  leagueName: string;
  code: string;
}) {
  const [user, memberCount] = await Promise.all([
    getCurrentUser(),
    prisma.miniLeagueMember.count({ where: { miniLeagueId: leagueId } }),
  ]);

  const isMember = user
    ? (await prisma.miniLeagueMember.findUnique({
        where: { userId_miniLeagueId: { userId: user.id, miniLeagueId: leagueId } },
      })) !== null
    : false;

  return (
    <>
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Te han invitado a la liga</p>
        <h1 className="font-mono text-2xl font-bold">{leagueName}</h1>
        <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-sm">
          <Users className="size-4" />
          {memberCount} {memberCount === 1 ? "jugador" : "jugadores"}
        </p>
      </div>

      {isMember ? (
        <Link
          href={`/liga/${leagueId}`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-colors"
        >
          Ya estás dentro · Ir a la liga
          <ArrowRight className="size-4" />
        </Link>
      ) : user ? (
        <JoinLeagueButton code={code} />
      ) : (
        <div className="space-y-3">
          <Link
            href={`/login?next=/unirse/${code}`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-colors"
          >
            <LogIn className="size-4" />
            Entrar o crear cuenta para unirte
          </Link>
          <p className="text-muted-foreground text-xs">
            Crea tu cuenta y te unirás a <span className="font-medium">{leagueName}</span>{" "}
            automáticamente.
          </p>
        </div>
      )}
    </>
  );
}
