import { Suspense } from "react";

import { getCurrentUser } from "@/lib/current-user";
import { getFirstLeagueInfo, getUserLeagues } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { getUnreadCount, getRecentNotifications } from "@/lib/notifications";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { BottomNav } from "@/components/app/bottom-nav";
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
        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <Suspense>
        <BottomNavSlot />
      </Suspense>
    </div>
  );
}

async function loadNavUser(): Promise<SidebarUser> {
  const user = await getCurrentUser();

  // Guest: shell con nav pública + CTA de login.
  if (!user) {
    return {
      isLoggedIn: false,
      name: "",
      email: "",
      initials: "",
      rank: null,
      leagueName: null,
      leagues: [],
    };
  }

  // Logged: rank/liga del shell + lista de ligas + avatar fresco desde BD.
  const [{ rank, leagueName }, leagues, dbUser] = await Promise.all([
    getFirstLeagueInfo(user.id),
    getUserLeagues(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { avatar: true } }),
  ]);

  return {
    isLoggedIn: true,
    name: user.name,
    email: user.email,
    initials: user.initials,
    avatar: dbUser?.avatar ?? null,
    rank,
    leagueName,
    leagues: leagues.map((l) => ({ id: l.id, name: l.name })),
  };
}

async function SidebarSlot() {
  return <Sidebar user={await loadNavUser()} />;
}

async function TopbarSlot() {
  const user = await loadNavUser();
  if (!user.isLoggedIn) return <Topbar user={user} />;

  const me = await getCurrentUser();
  const [count, items] = await Promise.all([
    getUnreadCount(me!.id),
    getRecentNotifications(me!.id),
  ]);
  return <Topbar user={user} notifications={{ count, items }} />;
}

async function BottomNavSlot() {
  const user = await loadNavUser();
  let notificationCount: number | undefined;
  if (user.isLoggedIn) {
    const me = await getCurrentUser();
    if (me) notificationCount = await getUnreadCount(me.id);
  }
  return <BottomNav user={user} notificationCount={notificationCount} />;
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
