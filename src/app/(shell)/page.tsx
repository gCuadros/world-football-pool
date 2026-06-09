import { Suspense } from "react";

import { getCurrentUser } from "@/lib/current-user";
import { Reveal } from "@/components/ui/reveal";
import { getDashboardData } from "@/lib/dashboard";
import { Dashboard } from "@/components/dashboard/dashboard";
import { Landing } from "@/components/landing/landing";
import { Skeleton } from "@/components/ui/skeleton";

// Raíz (dentro del shell persistente): guest → landing; logueado → dashboard.
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
    <Reveal fallback={<DashboardSkeleton />}>
      <DashboardSlot userId={user.id} userName={user.name} />
    </Reveal>
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
  return <div className="min-h-[60vh]" />;
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
