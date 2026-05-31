import {
  Crosshair,
  Flame,
  Medal,
  Trophy,
  Award,
  ListChecks,
  Crown,
  type LucideIcon,
} from "lucide-react";
import type { AchievementType } from "@prisma/client";

export type AchievementMeta = {
  type: AchievementType;
  label: string;
  description: string;
  icon: LucideIcon;
};

// Catálogo completo de logros (orden de presentación en la cuadrícula).
export const ACHIEVEMENTS: AchievementMeta[] = [
  {
    type: "PERFECT_SCORE",
    label: "Marcador perfecto",
    description: "Acierta el marcador exacto de un partido.",
    icon: Crosshair,
  },
  {
    type: "STREAK_3",
    label: "En racha",
    description: "3 aciertos consecutivos.",
    icon: Flame,
  },
  {
    type: "STREAK_5",
    label: "Imparable",
    description: "5 aciertos seguidos.",
    icon: Flame,
  },
  {
    type: "STREAK_10",
    label: "Vidente",
    description: "10 aciertos seguidos.",
    icon: Flame,
  },
  {
    type: "TOP_10",
    label: "Top 10",
    description: "Entra en el top 10 de la clasificación general.",
    icon: Medal,
  },
  {
    type: "TOP_3",
    label: "Podio",
    description: "Alcanza el top 3 de la clasificación general.",
    icon: Trophy,
  },
  {
    type: "ALL_GROUP_STAGE",
    label: "Fase de grupos",
    description: "Predice los 48 partidos de la fase de grupos.",
    icon: ListChecks,
  },
  {
    type: "CHAMPION_CALL",
    label: "Campeón",
    description: "Predice correctamente al campeón del Mundial.",
    icon: Crown,
  },
];

export const ACHIEVEMENT_FALLBACK_ICON = Award;
