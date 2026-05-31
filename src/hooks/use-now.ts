"use client";

import { useEffect, useState } from "react";

/** Devuelve la hora actual, refrescada cada `intervalMs` (1s por defecto). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
