import { Suspense } from "react";

import { getCurrentUser } from "@/lib/current-user";
import { getDashboardData } from "@/lib/dashboard";
import { AppShell } from "@/components/app/app-shell";
import { Dashboard } from "@/components/dashboard/dashboard";
import { Landing } from "@/components/landing/landing";
import { Skeleton } from "@/components/ui/skeleton";

// Raíz: guest → landing de marketing; logueado → dashboard dentro del shell.
export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeRouter />
    </Suspense>
  );
}

async function HomeRouter() {
  const user = await getCurrentUser();
  if (!user) return <Landing />;

  return (
    <AppShell>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardSlot userId={user.id} userName={user.name} />
      </Suspense>
    </AppShell>
  );
}

async function DashboardSlot({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const data = await getDashboardData(userId);
  return <Dashboard data={data} userName={userName} />;
}

function HomeFallback() {
  return <div className="min-h-dvh bg-background" />;
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
