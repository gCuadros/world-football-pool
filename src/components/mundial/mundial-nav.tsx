"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/mundial", label: "Grupos", exact: true },
  { href: "/eliminatorias", label: "Eliminatorias" },
  { href: "/resultados", label: "Resultados" },
];

export function MundialNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto py-3 scrollbar-none">
      {TABS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all",
              active
                ? "bg-primary text-primary-foreground shadow-[0_0_18px_-4px_var(--color-primary)]"
                : "text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
