// Helpers de formato de fecha/hora en es-ES. Pensados para ejecutarse en el
// cliente (zona horaria local del usuario). La BD guarda todo en UTC.

const dayFmt = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const timeFmt = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDay(iso: string): string {
  return dayFmt.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** "Hoy", "Mañana", "Ayer" o la fecha. */
export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(date) - startOf(now)) / 86_400_000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  if (diffDays === -1) return "Ayer";
  return formatDay(iso);
}

/** Segundos → "MM:SS" o "HH:MM:SS". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/**
 * Minuto en vivo legible: -1 es el sentinel de pausa que escribe el provider
 * (HT/BT) — sin él, el reloj se quedaba en "45'" durante todo el descanso.
 */
export function formatLiveMinute(minute: number | null): string {
  if (minute === -1) return "Descanso";
  if (minute === null) return "EN VIVO";
  return `${minute}'`;
}
