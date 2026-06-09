import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";

// Zona privada: solo el gate de sesión — el shell lo aporta (shell)/layout y
// persiste entre navegaciones. El gate vive en su propio Suspense para no
// bloquear el render del contenido.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <AuthGate />
      </Suspense>
      {children}
    </>
  );
}

async function AuthGate() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return null;
}
