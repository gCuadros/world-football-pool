"use client";

import { useState } from "react";
import { List } from "@phosphor-icons/react";

import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavContent, type SidebarUser } from "@/components/app/nav-content";

/** Botón hamburguesa + drawer de navegación para móvil/tablet (< lg). */
export function MobileNav({ user }: { user: SidebarUser }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menú"
            className="lg:hidden"
          />
        }
      >
        <List className="size-5" weight="bold" />
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="bg-sidebar w-[260px] p-0"
      >
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <NavContent user={user} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
