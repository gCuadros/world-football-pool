import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const navUser = {
    name: user.name,
    email: user.email,
    initials: user.initials,
    rank: user.rank,
  };

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={navUser} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={navUser} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
