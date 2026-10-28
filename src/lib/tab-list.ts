// Pestañas que se pueden desactivar en Ajustes. "Hoy" y "Ajustes" siempre están.
export const TABS = [
  { key: "calendario", label: "Calendario", href: "/calendario", hint: "Mes, semana y tu horario de clases." },
  { key: "tareas", label: "Tareas", href: "/tareas", hint: "Tus tareas, semanales y sin fecha." },
  { key: "trabajo", label: "Trabajo", href: "/trabajo", hint: "Turnos y horas trabajadas." },
  { key: "moodle", label: "Moodle", href: "/moodle", hint: "Entregas del campus virtual (Moodle)." },
  { key: "outlook", label: "Outlook", href: "/outlook", hint: "Eventos del calendario de Outlook." },
] as const;

export type TabKey = (typeof TABS)[number]["key"];
export const TAB_KEYS = TABS.map((t) => t.key) as TabKey[];
