import { TABS, getSettings } from "@/lib/settings";
import { HeaderBar } from "./header-bar";

/** Barra superior: solo las pestañas activas en Ajustes, y el menú de usuario. */
export async function Header() {
  const s = await getSettings();
  const links = [{ href: "/", label: "Hoy" }, ...TABS.filter((t) => s.on(t.key)).map(({ href, label }) => ({ href, label }))];
  return <HeaderBar links={links} name={s.name} />;
}
