import type { Metadata } from "next";

import { MULTIPLIERS } from "@/lib/scoring";
import { STAGE_LABELS } from "@/lib/labels";
import type { Stage } from "@prisma/client";

export const metadata: Metadata = {
  title: "Cómo funciona",
};

const STAGE_ORDER: Stage[] = [
  "GROUP_STAGE",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
  "FRIENDLY",
];

const EXAMPLES = [
  { pred: "2-1", real: "2-1", pts: 5, why: "Exacto: 1X2 + diferencia + exacto" },
  { pred: "2-1", real: "3-2", pts: 3, why: "Diferencia +1: 1X2 + diferencia" },
  { pred: "2-0", real: "1-0", pts: 1, why: "Solo 1X2 (local gana)" },
  { pred: "1-1", real: "0-0", pts: 3, why: "Empate exacto en diferencia (0): 1X2 + diferencia" },
  { pred: "0-1", real: "3-0", pts: 0, why: "Nada (local gana, se predijo visitante)" },
  { pred: "1-1 + pasa A", real: "1-1, gana A en penaltis", pts: 6, why: "1X2+dif (3) + quién pasa (3)" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-foreground text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Chip({ pts, label }: { pts: number | string; label: string }) {
  return (
    <div className="bg-card border-border flex items-center gap-3 rounded-xl border px-4 py-3">
      <span className="text-primary font-mono text-xl font-bold tabular-nums">+{pts}</span>
      <span className="text-foreground text-sm font-medium">{label}</span>
    </div>
  );
}

export default function ComoFuncionaPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-10 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-bold">Cómo funciona</h1>
        <p className="text-muted-foreground text-sm">
          El sistema de puntos es acumulativo: cada predicción puede sumar varias reglas a la vez.
          Los puntos se calculan sobre el marcador sin penaltis (incluyendo prórroga en eliminatorias).
        </p>
      </div>

      <Section title="Reglas de puntuación">
        <div className="grid gap-2 sm:grid-cols-2">
          <Chip pts={1} label="1X2 correcto (local / empate / visitante)" />
          <Chip pts={2} label="Diferencia de goles correcta" />
          <Chip pts={2} label="Resultado exacto (marcador exacto)" />
          <Chip pts={3} label="Quién pasa (solo eliminatorias, incluye penaltis)" />
        </div>
        <div className="bg-primary/5 border-primary/20 rounded-xl border p-4 text-sm space-y-1">
          <p className="text-foreground font-medium">Las reglas se suman:</p>
          <ul className="text-muted-foreground space-y-0.5 list-disc pl-4">
            <li>Acertar la diferencia implica acertar el 1X2 → <span className="text-foreground font-mono">1 + 2 = 3 pts</span></li>
            <li>Acertar el exacto implica acertar diferencia y 1X2 → <span className="text-foreground font-mono">1 + 2 + 2 = 5 pts</span></li>
            <li>Máximo en eliminatoria: exacto + quién pasa → <span className="text-foreground font-mono">5 + 3 = 8 pts base</span></li>
          </ul>
        </div>
      </Section>

      <Section title="Multiplicadores por fase">
        <div className="bg-card border-border overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="text-muted-foreground px-4 py-2.5 text-left font-medium">Fase</th>
                <th className="text-muted-foreground px-4 py-2.5 text-right font-medium">Multiplicador</th>
                <th className="text-muted-foreground px-4 py-2.5 text-right font-medium">Máx. pts</th>
              </tr>
            </thead>
            <tbody>
              {STAGE_ORDER.map((stage, i) => {
                const mult = MULTIPLIERS[stage];
                const isKnockout = stage !== "GROUP_STAGE" && stage !== "FRIENDLY";
                const maxBase = isKnockout ? 8 : 5;
                const maxTotal = maxBase * mult;
                return (
                  <tr
                    key={stage}
                    className={i < STAGE_ORDER.length - 1 ? "border-border border-b" : ""}
                  >
                    <td className="px-4 py-2.5 font-medium">{STAGE_LABELS[stage]}</td>
                    <td className="text-primary px-4 py-2.5 text-right font-mono font-bold">
                      {mult}×
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 text-right font-mono">
                      {Number.isInteger(maxTotal) ? maxTotal : maxTotal.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground text-xs">
          Total = puntos base × multiplicador. Se permiten decimales (p. ej. 5 × 1,5 = 7,5 pts).
        </p>
      </Section>

      <Section title="Ejemplos">
        <div className="bg-card border-border overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="text-muted-foreground px-4 py-2.5 text-left font-medium">Predices</th>
                <th className="text-muted-foreground px-4 py-2.5 text-left font-medium">Real</th>
                <th className="text-muted-foreground px-4 py-2.5 text-right font-medium">Pts</th>
                <th className="text-muted-foreground hidden px-4 py-2.5 text-left font-medium sm:table-cell">Por qué</th>
              </tr>
            </thead>
            <tbody>
              {EXAMPLES.map((ex, i) => (
                <tr key={i} className={i < EXAMPLES.length - 1 ? "border-border border-b" : ""}>
                  <td className="px-4 py-2.5 font-mono">{ex.pred}</td>
                  <td className="px-4 py-2.5 font-mono">{ex.real}</td>
                  <td className="text-primary px-4 py-2.5 text-right font-mono font-bold">
                    {ex.pts}
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-2.5 text-xs sm:table-cell">
                    {ex.why}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Selector ¿quién pasa?">
        <div className="bg-card border-border rounded-xl border p-4 text-sm space-y-2">
          <p className="text-foreground">
            En partidos de eliminatorias verás un selector extra para elegir qué equipo crees
            que avanza al siguiente ronda (incluyendo la posibilidad de penaltis).
          </p>
          <p className="text-muted-foreground">
            Este pick es independiente del marcador: puedes predecir empate 1-1 y que avance
            el equipo local (en penaltis). Si aciertas quién pasa, sumas <span className="text-primary font-mono font-bold">+3 pts</span> adicionales.
          </p>
          <p className="text-muted-foreground">
            El selector es opcional — si no lo rellenas, simplemente no optas a esos 3 puntos.
          </p>
        </div>
      </Section>
    </div>
  );
}
