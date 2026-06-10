import { cache, Suspense, ViewTransition } from "react";

import { getCurrentUser } from "@/lib/current-user";
import { getFirstLeagueInfo, getUserLeagues } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { getUnreadCount, getRecentNotifications } from "@/lib/notifications";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar, type TopbarNotifications } from "@/components/app/topbar";
import { BottomNav, BottomNavSkeleton } from "@/components/app/bottom-nav";
import { PullToRefresh } from "@/components/app/pull-to-refresh";
import { Skeleton } from "@/components/ui/skeleton";
import type { SidebarUser } from "@/components/app/nav-content";

/**
 * Shell unificado para toda la app (pública y privada): sidebar fijo en desktop
 * (≥ lg) + topbar con drawer móvil (< lg). El estado de sesión (logged/guest) se
 * resuelve dentro de <Suspense> para no bloquear el prerender de las páginas
 * públicas cacheadas. `requireAuth` lo aplican los layouts, no este componente.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarSlot />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<TopbarSkeleton />}>
          <TopbarSlot />
        </Suspense>
        <main className="flex-1 p-4 pb-nav-safe lg:p-6 lg:pb-6">
          <PullToRefresh>
            <ViewTransition>
              <div className="mx-auto w-full max-w-6xl overflow-x-clip">{children}</div>
            </ViewTransition>
          </PullToRefresh>
        </main>
      </div>
      {/* Fallback con la misma barra: el menú nunca desaparece mientras
          cargan los datos de usuario (BD lenta, refresh, navegación fría). */}
      <Suspense fallback={<BottomNavSkeleton />}>
        <BottomNavSlot />
      </Suspense>
    </div>
  );
}

const GUEST_NAV: SidebarUser = {
  isLoggedIn: false,
  name: "",
  email: "",
  initials: "",
  rank: null,
  leagueName: null,
  leagues: [],
  activeLeagueId: null,
};

// `cache()`: los tres slots del shell (sidebar/topbar/bottom-nav) comparten UNA
// sola ejecución por request — antes eran 3 tandas de queries idénticas, que
// con la BD fría multiplicaban el tiempo en fallback (flash de skeletons).
// Nunca lanza: si la BD no responde, degrada (nav de invitado o usuario sin
// ligas) en vez de tumbar el shell entero.
const loadNavUser = cache(async function loadNavUser(): Promise<SidebarUser> {
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    return GUEST_NAV;
  }

  // Guest: shell con nav pública + CTA de login.
  if (!user) return GUEST_NAV;

  try {
    // Logged: rank/liga del shell + lista de ligas + avatar/favorita desde BD.
    const [{ rank, leagueName }, leagues, dbUser] = await Promise.all([
      getFirstLeagueInfo(user.id),
      getUserLeagues(user.id),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { avatar: true, favoriteLeagueId: true },
      }),
    ]);

    // Liga activa: la favorita si sigue siendo válida, si no la primera.
    const leagueIds = leagues.map((l) => l.id);
    const fav = dbUser?.favoriteLeagueId ?? null;
    const activeLeagueId =
      fav && leagueIds.includes(fav) ? fav : (leagues[0]?.id ?? null);

    return {
      isLoggedIn: true,
      name: user.name,
      email: user.email,
      initials: user.initials,
      avatar: dbUser?.avatar ?? null,
      rank,
      leagueName,
      leagues: leagues.map((l) => ({ id: l.id, name: l.name })),
      activeLeagueId,
    };
  } catch {
    // BD caída a mitad: usuario logueado con nav mínima antes que sin nav.
    return {
      ...GUEST_NAV,
      isLoggedIn: true,
      name: user.name,
      email: user.email,
      initials: user.initials,
    };
  }
});

async function SidebarSlot() {
  return <Sidebar user={await loadNavUser()} />;
}

async function TopbarSlot() {
  const user = await loadNavUser();
  if (!user.isLoggedIn) return <Topbar user={user} />;

  // Las notificaciones son secundarias: si la BD falla, topbar sin campana.
  let notifications: TopbarNotifications | undefined;
  try {
    const me = await getCurrentUser();
    const [count, items] = await Promise.all([
      getUnreadCount(me!.id),
      getRecentNotifications(me!.id),
    ]);
    notifications = { count, items };
  } catch {
    notifications = undefined;
  }
  return <Topbar user={user} notifications={notifications} />;
}

async function BottomNavSlot() {
  return <BottomNav user={await loadNavUser()} />;
}

function SidebarSkeleton() {
  return (
    <aside className="bg-sidebar border-sidebar-border hidden w-[260px] shrink-0 flex-col gap-4 border-r p-4 lg:flex">
      <Skeleton className="h-8 w-32" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </aside>
  );
}

function TopbarSkeleton() {
  return (
    <header className="border-border flex h-16 items-center gap-3 border-b px-4 lg:px-6">
      <Skeleton className="size-8 lg:hidden" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="ml-auto size-8" />
    </header>
  );
}
