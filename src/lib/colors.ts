// Colores por asignatura: se reparten por orden alfabético para que no se repitan
// (con más de 8 asignaturas, vuelven a empezar).
const PALETTE = ["#e05252", "#3b82f6", "#22a35a", "#a0522d", "#9b59b6", "#d4a017", "#14a3a3", "#e67e22"];

export function subjectColors(subjects: string[]): Map<string, string> {
  const unique = [...new Set(subjects.map((s) => s.trim().toLowerCase()))].sort((a, b) => a.localeCompare(b, "es"));
  return new Map(unique.map((s, i) => [s, PALETTE[i % PALETTE.length]]));
}

export function colorFor(colors: Map<string, string>, subject: string): string {
  return colors.get(subject.trim().toLowerCase()) ?? PALETTE[0];
}

export const SOURCE_COLORS = { moodle: "#d97706", outlook: "#64748b", tarea: "#db2777", trabajo: "#0d9488" } as const;
