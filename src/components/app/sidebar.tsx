import { NavContent, type SidebarUser } from "@/components/app/nav-content";

/** Sidebar fijo en desktop (≥ lg). En móvil se usa el drawer (MobileNav). */
export function Sidebar({ user }: { user: SidebarUser }) {
  return (
    <aside className="bg-sidebar border-sidebar-border hidden w-[260px] shrink-0 flex-col border-r lg:flex">
      <NavContent user={user} />
    </aside>
  );
}
