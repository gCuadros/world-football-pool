"use client";

import { useEffect, useState } from "react";

/**
 * Número que cuenta de 0 a `value` al montar (ease-out, ~0.9s). El servidor y
 * la primera pintura muestran el valor final (sin saltos de layout ni
 * mismatch); la animación arranca tras montar y se omite con
 * prefers-reduced-motion.
 */
export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(t) {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
