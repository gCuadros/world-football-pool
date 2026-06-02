import { AppShell } from "@/components/app/app-shell";

// Zona pública (sin login): mismo shell unificado que la zona privada.
// El AppShell adapta la navegación según haya sesión o no.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
