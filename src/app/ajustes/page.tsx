import { db } from "@/db";
import { integrationStatus } from "@/db/schema";
import { Header } from "@/components/header";
import { IntegrationStatus } from "@/components/integration-status";
import { PageHeading } from "@/components/page-heading";
import { moodleBaseUrl } from "@/integrations/moodle/config";
import { TABS, getSettings } from "@/lib/settings";
import { MoodleHowTo, OutlookHowTo } from "./how-to";
import { LinkForm, NameForm, PasswordForm, TabSwitch } from "./settings-forms";
import { TokenHelper } from "./token-helper";
import { Welcome } from "./welcome";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const [s, statuses] = await Promise.all([getSettings(), db.select().from(integrationStatus)]);
  const status = (src: "moodle" | "outlook") => statuses.find((x) => x.source === src);

  // Primera vez: asistente que pide las cosas de una en una.
  if (!s.welcomed) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-xl space-y-8 px-4 pb-16 pt-10 sm:pt-16">
          <div className="space-y-4">
            <h1 className="text-[2.25rem] font-light leading-[1.05] tracking-[-0.035em] sm:text-[2.75rem]">Te damos la bienvenida.</h1>
            <p className="text-muted">
              Junta en un sitio tus clases, tareas, entregas y turnos. Te hacemos unas pocas preguntas y listo; todo se puede cambiar
              luego en Ajustes, desde el menú de arriba a la derecha.
            </p>
          </div>
          <Welcome />
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-8 sm:pt-12">
        <PageHeading title="Ajustes" subtitle="Elige qué pestañas ves y configura las conexiones. Se guarda al momento." />

        <section className="card space-y-4">
          <h2 className="section-title">Tu nombre</h2>
          <NameForm name={s.name} />
        </section>

        <section className="card p-0">
          <div className="px-5 pb-2 pt-4">
            <h2 className="section-title">Pestañas</h2>
            <p className="mt-1 text-[13px] text-muted">
              Lo que desactives desaparece de la barra y de Hoy. Moodle y Outlook además dejan de sincronizarse. No se borra nada.
            </p>
          </div>
          <ul className="divide-y divide-line">
            <li className="flex items-center gap-4 px-5 py-3.5 text-muted">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Hoy</span>
                <span className="block text-[13px]">Siempre visible: es la portada.</span>
              </span>
              <input type="checkbox" role="switch" className="switch" checked disabled aria-label="Pestaña Hoy" />
            </li>
            {TABS.map((t) => (
              <li key={t.key}>
                <label className="flex cursor-pointer items-center gap-4 px-5 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-[13px] text-muted">{t.hint}</span>
                  </span>
                  <TabSwitch tab={t.key} label={t.label} on={s.on(t.key)} />
                </label>
              </li>
            ))}
          </ul>
        </section>

        {s.on("moodle") && (
          <section className="card space-y-4">
            <h2 className="section-title">Moodle</h2>
            {s.moodleIcalUrl ? (
              <IntegrationStatus label="Moodle" status={status("moodle")} configured />
            ) : (
              <MoodleHowTo />
            )}
            <LinkForm kind="moodle" url={s.moodleIcalUrl} placeholder="Enlace del calendario de Moodle (https://…)" />
            <div className="border-t border-line pt-4">
              <TokenHelper moodleUrl={moodleBaseUrl(s.moodleIcalUrl, s.moodleUrl)} hasToken={!!s.moodleToken} />
            </div>
          </section>
        )}

        {s.on("outlook") && (
          <section className="card space-y-4">
            <h2 className="section-title">Outlook</h2>
            {s.outlookIcsUrl ? (
              <IntegrationStatus label="Outlook" status={status("outlook")} configured />
            ) : (
              <OutlookHowTo />
            )}
            <LinkForm kind="outlook" url={s.outlookIcsUrl} placeholder="Enlace ICS de Outlook (https://…)" />
          </section>
        )}

        <section className="card space-y-4">
          <h2 className="section-title">Contraseña</h2>
          <PasswordForm />
        </section>
      </main>
    </>
  );
}
