/**
 * Extrae el token de un enlace "moodlemobile://token=<base64>" que devuelve
 * /admin/tool/mobile/launch.php tras iniciar sesión con SSO.
 * El base64 contiene "firma:::token" o "firma:::token:::tokenprivado".
 */
export function extractToken(link: string): string | null {
  const m = link.trim().match(/token=([A-Za-z0-9+/=_-]+)/);
  if (!m) return null;
  try {
    const decoded = atob(m[1].replace(/-/g, "+").replace(/_/g, "/"));
    const token = decoded.split(":::")[1];
    return token && /^[a-f0-9]{32}$/i.test(token) ? token : null;
  } catch {
    return null;
  }
}
