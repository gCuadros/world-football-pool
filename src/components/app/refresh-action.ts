"use server";

import { revalidateTag } from "next/cache";

import { TAGS } from "@/lib/cache-tags";

/**
 * Invalida la caché de partidos para que el siguiente render relea la BD.
 * `router.refresh()` por sí solo NO rompe un `use cache`, así que el botón de
 * actualizar no traía marcadores nuevos hasta que el cron revalidaba el tag.
 * Con esto, pulsar actualizar fuerza el dato más fresco (marcadores en vivo).
 */
export async function refreshMatchesCache() {
  revalidateTag(TAGS.matches, "max");
}
