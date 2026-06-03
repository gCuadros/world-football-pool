"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Botón de compartir invitación a una liga: usa Web Share API (WhatsApp, etc.)
 * con fallback a copiar el enlace. Muestra también el código para copiar.
 */
export function ShareLeague({
  code,
  leagueName,
}: {
  code: string;
  leagueName: string;
}) {
  const [copied, setCopied] = useState(false);

  function inviteUrl() {
    return `${window.location.origin}/unirse/${code}`;
  }

  async function share() {
    const url = inviteUrl();
    const text = `Únete a mi liga «${leagueName}» en la Quiniela del Mundial 2026`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Quiniela Mundial 2026", text, url });
        return;
      } catch {
        // cancelado o no soportado → cae al copiado
      }
    }
    await navigator.clipboard.writeText(`${text}: ${url}`);
    toast.success("Enlace de invitación copiado");
  }

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      toast.success("Código copiado");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={share}
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors"
      >
        <Share2 className="size-4" />
        Invitar
      </button>
      <button
        onClick={copyCode}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-mono text-sm transition-colors"
      >
        <span className="bg-muted rounded px-2 py-0.5 tracking-widest">{code}</span>
        {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}
