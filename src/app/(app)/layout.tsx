import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { Skeleton } from "@/components/ui/skeleton";

// Shell estático (estructura) servido al instante; el sidebar y el topbar
// dependen de la sesión, así que se cargan en streaming dentro de <Suspense>.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarSlot />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<TopbarSkeleton />}>
          <TopbarSlot />
        </Suspense>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

async function loadNavUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return {
    name: user.name,
    email: user.email,
    initials: user.initials,
    rank: user.rank,
  };
}

async function SidebarSlot() {
  return <Sidebar user={await loadNavUser()} />;
}

async function TopbarSlot() {
  return <Topbar user={await loadNavUser()} />;
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
