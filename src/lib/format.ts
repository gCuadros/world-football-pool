// Helpers de formato de fecha/hora en es-ES, SIEMPRE en hora peninsular
// (Europe/Madrid), igual que la cabecera de la página de partido. La BD
// guarda todo en UTC. Sin zona fija, los componentes servidor (hero del
// inicio) formateaban en la zona del servidor — UTC en Vercel — y mostraban
// las 02:00 para un partido de las 04:00, mientras las vistas cliente
// pintaban la hora correcta: misma app, dos horas distintas.

const TZ = "Europe/Madrid";

const dayFmt = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: TZ,
});

const timeFmt = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

// "YYYY-MM-DD" del día civil en Madrid (en-CA da ISO): parseado vuelve a ser
// medianoche UTC, así que las diferencias entre días salen exactas.
const civilDayFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TZ,
});

export function formatDay(iso: string): string {
  return dayFmt.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

/** "Hoy", "Mañana", "Ayer" o la fecha — por día civil de Madrid. */
export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const civilDay = (d: Date) => Date.parse(civilDayFmt.format(d));
  const diffDays = Math.round((civilDay(new Date(iso)) - civilDay(now)) / 86_400_000);
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
