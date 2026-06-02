import {
  Globe,
  Radio,
  Trophy,
  Users,
  Medal,
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

// Navegación de la zona pública (sin login).
export const PUBLIC_NAV: NavItem[] = [
  { href: "/resultados", label: "Resultados", title: "Resultados en vivo", icon: Radio },
  { href: "/mundial", label: "Mundial", title: "Info del Mundial", icon: Globe },
];

// Navegación de la zona privada (login + liga).
export const APP_NAV: NavItem[] = [
  { href: "/ligas", label: "Mis Ligas", title: "Mis Ligas", icon: Users },
];

export const ACCOUNT_NAV: NavItem[] = [
  { href: "/logros", label: "Logros", title: "Logros", icon: Medal },
  { href: "/ajustes", label: "Ajustes", title: "Ajustes", icon: Settings },
];

export const ALL_NAV = [...PUBLIC_NAV, ...APP_NAV, ...ACCOUNT_NAV];

export function titleForPath(pathname: string): string {
  // Liga dinámica
  const ligaMatch = pathname.match(/^\/liga\/([^/]+)(\/predicciones)?$/);
  if (ligaMatch) return ligaMatch[2] ? "Mis Predicciones" : "Clasificación";

  const match = ALL_NAV.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );
  return match?.title ?? "Quiniela";
}

// Re-export legacy Trophy icon for shell compatibility.
export { Trophy };
