"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Los <meta name="theme-color"> que genera `viewport` siguen el tema del
 * SISTEMA (media queries). Si el usuario fuerza claro/oscuro dentro de la app,
 * la barra de estado del móvil quedaría del color contrario. Este componente
 * sobreescribe el content de esos meta con el color del tema resuelto, para
 * que la barra de estado (PWA instalada y Safari/Chrome) acompañe siempre a la
 * interfaz.
 */
const THEME_COLOR: Record<string, string> = {
  light: "#F4F7FF",
  dark: "#07090F",
};

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = THEME_COLOR[resolvedTheme ?? "light"];
    if (!color) return;
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute("content", color));
  }, [resolvedTheme]);

  return null;
}
