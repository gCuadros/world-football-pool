import Link from "next/link";
import { MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="border-border bg-card flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border p-10 text-center">
      <div className="bg-secondary text-primary mb-4 flex size-14 items-center justify-center rounded-2xl">
        <MapPinOff className="size-7" />
      </div>
      <p className="text-primary font-mono text-xs tracking-widest uppercase">
        Error 404
      </p>
      <h2 className="mt-1 text-xl font-bold">Página no encontrada</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        La página que buscas no existe o se ha movido.
      </p>
      <Button render={<Link href="/partidos" />} className="mt-6">
        Volver a Partidos
      </Button>
    </div>
  );
}
