/**
 * Vibración háptica para las interacciones clave (guardar predicción, steppers,
 * navegación). Usa la Vibration API: funciona en Android (Chrome/Edge/Samsung);
 * iOS la ignora en silencio, así que es seguro llamarla siempre.
 */
function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Algunos navegadores lanzan si el documento no tiene interacción previa.
  }
}

export const haptics = {
  /** Toque ligero: cambiar un stepper, elegir un quick pick, navegar. */
  tap: () => vibrate(10),
  /** Confirmación: predicción guardada, acción completada. */
  success: () => vibrate([15, 60, 30]),
  /** Error o acción bloqueada. */
  error: () => vibrate([50, 80, 50]),
};
