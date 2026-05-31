import {
  Radio,
  Trophy,
  Target,
  Users,
  BarChart3,
  Bell,
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

export const PRIMARY_NAV: NavItem[] = [
  { href: "/partidos", label: "Partidos", title: "Partidos en directo", icon: Radio },
  { href: "/clasificacion", label: "Clasificación", title: "Clasificación", icon: Trophy },
  { href: "/predicciones", label: "Mis Predicciones", title: "Mis Predicciones", icon: Target },
  { href: "/mini-ligas", label: "Mini-ligas", title: "Mini-ligas", icon: Users },
  { href: "/estadisticas", label: "Estadísticas", title: "Estadísticas", icon: BarChart3 },
];

export const ACCOUNT_NAV: NavItem[] = [
  { href: "/notificaciones", label: "Notificaciones", title: "Notificaciones", icon: Bell },
  { href: "/logros", label: "Logros", title: "Logros", icon: Medal },
  { href: "/ajustes", label: "Ajustes", title: "Ajustes", icon: Settings },
];

export const ALL_NAV = [...PRIMARY_NAV, ...ACCOUNT_NAV];

export function titleForPath(pathname: string): string {
  const match = ALL_NAV.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/"),
  );
  return match?.title ?? "Quiniela";
}
