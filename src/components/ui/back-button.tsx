"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({
  label = "Atrás",
  className = "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors",
}: {
  label?: string;
  className?: string;
} = {}) {
  const router = useRouter();

  return (
    <button onClick={() => router.back()} className={className} type="button">
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}
