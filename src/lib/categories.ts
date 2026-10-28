import type { TaskCategory } from "@/db/schema";

// Tipos de tarea propia, cada uno con su color en todas las vistas.
export const CATEGORIES: Record<TaskCategory, { label: string; color: string; due: boolean }> = {
  tarea: { label: "Tarea", color: "#db2777", due: true },
  entrega: { label: "Entrega", color: "#0891b2", due: true },
  examen: { label: "Examen", color: "#dc2626", due: false },
  reunion: { label: "Reunión", color: "#7c3aed", due: false },
  personal: { label: "Personal", color: "#16a34a", due: false },
};
// `due`: en la semana va en la burbuja de entregas; si no, entre las horas como un evento.

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as TaskCategory[];
