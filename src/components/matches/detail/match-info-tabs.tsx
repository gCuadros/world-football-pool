"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";

type InfoTab = "resumen" | "estadisticas" | "alineaciones";

export function MatchInfoTabs({
  resumen,
  estadisticas,
  alineaciones,
}: {
  resumen: React.ReactNode;
  estadisticas?: React.ReactNode;
  alineaciones?: React.ReactNode;
}) {
  const options = [
    { value: "resumen" as InfoTab, label: "Resumen" },
    ...(estadisticas != null
      ? [{ value: "estadisticas" as InfoTab, label: "Estadísticas" }]
      : []),
    ...(alineaciones != null
      ? [{ value: "alineaciones" as InfoTab, label: "Alineaciones" }]
      : []),
  ];

  const [tab, setTab] = useState<InfoTab>("resumen");

  return (
    <div className="space-y-4">
      {options.length > 1 && (
        <Segmented value={tab} onChange={setTab} options={options} />
      )}
      <div hidden={tab !== "resumen"}>{resumen}</div>
      {estadisticas != null && (
        <div hidden={tab !== "estadisticas"}>{estadisticas}</div>
      )}
      {alineaciones != null && (
        <div hidden={tab !== "alineaciones"}>{alineaciones}</div>
      )}
    </div>
  );
}
