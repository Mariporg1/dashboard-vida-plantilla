import type { ExternalItem, Source } from "@/db/schema";

/** Lo que devuelve cada integración: elementos normalizados, sin ids de base de datos. */
export type FetchedItem = Pick<
  ExternalItem,
  "externalId" | "kind" | "title" | "course" | "url" | "startsAt" | "endsAt" | "allDay" | "status"
>;

export type FetchResult = {
  items: FetchedItem[];
  mode: "api" | "ical";
  /** Problema no fatal que conviene mostrar (p. ej. se usó la alternativa). */
  warning?: string;
};

export type Integration = {
  source: Source;
  label: string;
  /** false si no hay ningún enlace configurado: no se intenta sincronizar. */
  isConfigured(): Promise<boolean>;
  fetch(now: Date): Promise<FetchResult>;
};

/** Error con un mensaje pensado para mostrarse tal cual en el dashboard. */
export class IntegrationError extends Error {}
