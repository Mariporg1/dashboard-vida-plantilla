/**
 * Limpia un enlace de calendario pegado por el usuario. Acepta webcal:// (lo que sale en algunos
 * botones de "suscribirse") y lo convierte en https://. Devuelve null si no parece un enlace.
 */
export function normalizeCalendarUrl(input: string): string | null {
  const raw = input.trim().replace(/^["'<]|["'>]$/g, "").trim();
  if (!raw) return null;
  const withScheme = raw.replace(/^webcals?:\/\//i, "https://");
  try {
    const url = new URL(withScheme);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
