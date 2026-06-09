import { AppShell } from "@/components/app/app-shell";

/**
 * Layout compartido de TODA la zona con shell (pública y privada). Al vivir en
 * un único route group, el shell (topbar, sidebar, bottom-nav) persiste entre
 * navegaciones — sin remontarse ni parpadear — y solo cambia el contenido.
 * Antes cada grupo montaba su propio AppShell y el menú desaparecía al cruzar
 * de zona.
 */
export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
