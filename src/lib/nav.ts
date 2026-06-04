import {
  Radio,
  Globe,
  Network,
  Newspaper,
  Handshake,
  HelpCircle,
  CalendarDays,
  Users,
  SquarePen,
  User,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  title: string;
  icon: LucideIcon;
  badge?: string;
};

// EXPLORAR — zona pública (sin login).
export const EXPLORE_NAV: NavItem[] = [
  { href: "/resultados", label: "Resultados", title: "Resultados en vivo", icon: Radio },
  { href: "/calendario", label: "Calendario", title: "Calendario", icon: CalendarDays },
  { href: "/mundial", label: "Mundial", title: "Info del Mundial", icon: Globe },
  { href: "/eliminatorias", label: "Eliminatorias", title: "Cuadro de eliminatorias", icon: Network },
  { href: "/amistosos", label: "Amistosos", title: "Amistosos", icon: Handshake },
  { href: "/noticias", label: "Noticias", title: "Noticias", icon: Newspaper },
  { href: "/como-funciona", label: "Cómo funciona", title: "Cómo funciona", icon: HelpCircle },
];

// MIS LIGAS — zona privada. "Predicciones" es dinámica (liga activa) y se compone
// en el NavContent a partir de las ligas del usuario.
export const LEAGUE_NAV: NavItem[] = [
  { href: "/ligas", label: "Mis Ligas", title: "Mis Ligas", icon: Users },
];

// CUENTA — Perfil y Ajustes viven en /ajustes (pantalla combinada del diseño).
export const ACCOUNT_NAV: NavItem[] = [
  { href: "/ajustes", label: "Perfil", title: "Perfil", icon: User },
  { href: "/ajustes", label: "Ajustes", title: "Ajustes", icon: Settings },
];

export const PREDICCIONES_ICON = SquarePen;

const ALL_NAV = [...EXPLORE_NAV, ...LEAGUE_NAV, ...ACCOUNT_NAV];

export function titleForPath(pathname: string): string {
  const ligaMatch = pathname.match(/^\/liga\/([^/]+)(\/predicciones)?$/);
  if (ligaMatch) return ligaMatch[2] ? "Mis Predicciones" : "Clasificación";

  const match = ALL_NAV.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );
  return match?.title ?? "Quiniela";
}
