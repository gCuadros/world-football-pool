"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-mono text-sm transition-colors"
    >
      <span className="bg-muted rounded px-2 py-0.5 tracking-widest">{code}</span>
      {copied ? (
        <Check className="size-3.5 text-green-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
      <span className="text-xs">{copied ? "¡Copiado!" : "Copiar código"}</span>
    </button>
  );
}
