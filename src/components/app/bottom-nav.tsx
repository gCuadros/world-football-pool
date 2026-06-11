"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Broadcast,
  UsersThree,
  SignIn,
  GlobeHemisphereWest,
  PencilSimpleLine,
  Trophy,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import type { SidebarUser } from "@/components/app/nav-content";

type NavItem = {
  href: string;
  label: string;
  icon: PhosphorIcon;
  exact?: boolean;
};

const GUEST_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: House, exact: true },
  { href: "/resultados", label: "Partidos", icon: Broadcast },
  { href: "/mundial", label: "Grupos", icon: GlobeHemisphereWest },
  { href: "/login", label: "Entrar", icon: SignIn },
];

/**
 * Fallback estático del menú inferior: misma barra flotante (forma, blur,
 * safe-area) con los tabs públicos deshabilitados visualmente. Evita que el
 * menú "desaparezca" mientras el slot con datos de usuario está suspendido.
 */
export function BottomNavSkeleton() {
  return (
    <nav
      aria-hidden
      className="vt-bottom-nav glass-nav fixed inset-x-4 z-30 mx-auto flex h-14 max-w-sm select-none items-center justify-around rounded-full px-2 lg:hidden"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      {GUEST_ITEMS.map(({ href, label, icon: Icon }) => (
        <span
          key={href}
          aria-label={label}
          className="text-muted-foreground/40 flex size-11 items-center justify-center"
        >
          <Icon className="size-5" weight="regular" />
        </span>
      ))}
    </nav>
  );
}

/**
 * Contenido del tab con feedback de navegación en curso (useLinkStatus):
 * mientras la ruta destino carga, el icono pulsa — el toque "responde" al
 * instante aunque la BD tarde, como el spinner de una tab bar nativa.
 * fill cuando activo: el cambio de peso del icono es la señal de estado
 * de las tab bars nativas premium.
 */
function TabBody({
  icon: Icon,
  label,
  active,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  return (
    <>
      <Icon
        className={cn(
          active ? "size-4.5" : "size-5.5",
          pending && !active && "motion-safe:animate-pulse text-foreground",
        )}
        weight={active || pending ? "fill" : "regular"}
      />
      {active && <span className="whitespace-nowrap">{label}</span>}
    </>
  );
}

export function BottomNav({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const activeLeagueId = user.activeLeagueId;
  const activeLeague = user.leagues.find((l) => l.id === activeLeagueId);

  // Tab de liga: lleva a la favorita/activa pero con etiqueta fija "Liga"
  // (el nombre lo ponen los usuarios y puede ser largo o raro para un tab).
  const leagueItem: NavItem = activeLeague
    ? { href: `/liga/${activeLeague.id}`, label: "Liga", icon: Trophy }
    : { href: "/ligas", label: "Ligas", icon: UsersThree };

  // Perfil vive en el topbar (avatar); aquí entra Partidos, núcleo de la app.
  const items: NavItem[] = user.isLoggedIn
    ? [
        { href: "/", label: "Inicio", icon: House, exact: true },
        { href: "/resultados", label: "Partidos", icon: Broadcast },
        ...(activeLeagueId
          ? [{ href: `/liga/${activeLeagueId}/predicciones`, label: "Predecir", icon: PencilSimpleLine }]
          : []),
        leagueItem,
        { href: "/mundial", label: "Mundial", icon: GlobeHemisphereWest },
      ]
    : GUEST_ITEMS;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    const matches = pathname === href || pathname.startsWith(href + "/");
    // El tab de liga (/liga/{id}) no se resalta en su subruta /predicciones,
    // que tiene su propio tab.
    if (href.startsWith("/liga/") && !href.includes("/predicciones")) {
      return matches && !pathname.includes("/predicciones");
    }
    return matches;
  };

  return (
    /* Tab bar flotante Liquid Glass: barra píldora despegada de los bordes,
       tabs inactivos solo-icono y el activo como pill rellena icono+label. */
    <nav
      aria-label="Navegación principal"
      className="vt-bottom-nav glass-nav fixed inset-x-4 z-30 mx-auto flex h-14 max-w-sm select-none items-center justify-between rounded-full px-2 lg:hidden"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            onClick={() => haptics.tap()}
            className={cn(
              "flex h-11 shrink-0 items-center justify-center rounded-full",
              active
                ? "bg-primary text-primary-foreground gap-1.5 px-4 text-xs font-bold shadow-[0_2px_14px_-3px_var(--color-primary)]"
                : "text-muted-foreground active:text-foreground size-11 transition-colors",
            )}
          >
            <TabBody icon={Icon} label={label} active={active} />
          </Link>
        );
      })}
    </nav>
  );
}
