"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="border-destructive/30 bg-card flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border p-10 text-center">
      <div className="bg-destructive/10 text-destructive mb-4 flex size-14 items-center justify-center rounded-2xl">
        <AlertTriangle className="size-7" />
      </div>
      <h2 className="text-xl font-bold">Algo ha ido mal</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        No hemos podido cargar esta sección. Puede ser un problema temporal de
        conexión con la base de datos. Inténtalo de nuevo.
      </p>
      <Button onClick={reset} className="mt-6">
        <RotateCcw className="size-4" />
        Reintentar
      </Button>
    </div>
  );
}
