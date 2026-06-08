import { Reveal } from "@/components/ui/reveal";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTeams } from "@/lib/queries";
import { AjustesView } from "@/components/settings/ajustes-view";
import Loading from "./loading";

export const metadata = { title: "Ajustes" };

export default function AjustesPage() {
  return (
    <Reveal fallback={<Loading />}>
      <AjustesContent />
    </Reveal>
  );
}

async function AjustesContent() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let name = session.user.name ?? "";
  const email = session.user.email ?? "";
  let favoriteTeam: string | null = null;
  let avatar: string | null = null;
  let teams;
  let prefs = {
    notifyLiveGoals: true,
    notifyResults: true,
    notifyReminders: true,
    notifyLeague: true,
    notifyMatchStart: true,
    notifyMatchStartAll: false,
    followedTeams: [] as string[],
  };
  try {
    const [user, teamList] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          favoriteTeam: true,
          avatar: true,
          notifyLiveGoals: true,
          notifyResults: true,
          notifyReminders: true,
          notifyLeague: true,
          notifyMatchStart: true,
          notifyMatchStartAll: true,
          followedTeams: true,
        },
      }),
      getTeams(),
    ]);
    name = user?.name ?? name;
    favoriteTeam = user?.favoriteTeam ?? null;
    avatar = user?.avatar ?? null;
    teams = teamList;
    if (user) {
      prefs = {
        notifyLiveGoals: user.notifyLiveGoals,
        notifyResults: user.notifyResults,
        notifyReminders: user.notifyReminders,
        notifyLeague: user.notifyLeague,
        notifyMatchStart: user.notifyMatchStart,
        notifyMatchStartAll: user.notifyMatchStartAll,
        followedTeams: user.followedTeams,
      };
    }
  } catch {
    return (
      <div className="border-warning/40 bg-warning/10 rounded-2xl border p-8">
        <h2 className="text-xl font-bold">Conecta tu base de datos</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          No se pudieron cargar tus ajustes. Revisa Supabase en{" "}
          <code className="font-mono">.env</code>.
        </p>
      </div>
    );
  }

  return (
    <AjustesView
      initialName={name}
      initialTeam={favoriteTeam}
      initialAvatar={avatar}
      teams={teams}
      email={email}
      initialPrefs={prefs}
    />
  );
}
