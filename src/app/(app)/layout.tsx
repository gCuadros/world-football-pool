import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { AppShell } from "@/components/app/app-shell";

// Zona privada: el shell unificado + gate de sesión. El gate vive en su propio
// Suspense para no bloquear el shell (que ya resuelve la sesión por su cuenta).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <Suspense>
        <AuthGate />
      </Suspense>
      {children}
    </AppShell>
  );
}

async function AuthGate() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return null;
}
