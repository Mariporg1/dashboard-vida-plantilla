"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { TABS, type TabKey } from "@/lib/tab-list";
import { normalizeCalendarUrl } from "@/lib/calendar-url";
import { finishWelcome } from "./actions";
import { MoodleHowTo, OutlookHowTo } from "./how-to";

type Step = "name" | "tabs" | "moodle" | "outlook" | "done";

/** Asistente de la primera vez: pide las cosas de una en una y lo guarda todo al final. */
export function Welcome() {
  const [name, setName] = useState("");
  const [tabs, setTabs] = useState<Record<TabKey, boolean>>(
    Object.fromEntries(TABS.map((t) => [t.key, true])) as Record<TabKey, boolean>,
  );
  const [moodle, setMoodle] = useState("");
  const [outlook, setOutlook] = useState("");
  const [step, setStep] = useState<Step>("name");
  const [saving, setSaving] = useState(false);

  const steps: Step[] = ["name", "tabs", ...(tabs.moodle ? ["moodle" as const] : []), ...(tabs.outlook ? ["outlook" as const] : []), "done"];
  const index = steps.indexOf(step);
  const go = (delta: number) => setStep(steps[Math.min(steps.length - 1, Math.max(0, index + delta))]);
  const badLink = (v: string) => v.trim() !== "" && !normalizeCalendarUrl(v);

  return (
    <form
      action={finishWelcome}
      onSubmit={(e) => {
        // Intro en un campo no termina el asistente: solo pasa al paso siguiente.
        if (step !== "done") {
          e.preventDefault();
          if (!(step === "moodle" && badLink(moodle)) && !(step === "outlook" && badLink(outlook))) go(1);
          return;
        }
        setSaving(true);
      }}
      className="space-y-8"
    >
      {/* Todo viaja en el mismo formulario aunque solo se vea un paso. */}
      <input type="hidden" name="name" value={name} />
      {TABS.map((t) => tabs[t.key] && <input key={t.key} type="hidden" name={`tab-${t.key}`} value="on" />)}
      <input type="hidden" name="moodle" value={tabs.moodle ? moodle : ""} />
      <input type="hidden" name="outlook" value={tabs.outlook ? outlook : ""} />

      <p className="text-[13px] tabular-nums text-muted">
        Paso {index + 1} de {steps.length}
      </p>

      {step === "name" && (
        <Section title="¿Cómo te llamas?" text="Para saludarte en la pestaña Hoy. Puedes dejarlo vacío.">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
            placeholder="Tu nombre"
            aria-label="Tu nombre"
            className="input w-full"
          />
        </Section>
      )}

      {step === "tabs" && (
        <Section title="¿Qué quieres ver?" text="Quita lo que no uses. Hoy siempre está. Podrás cambiarlo cuando quieras en Ajustes.">
          <fieldset className="card divide-y divide-line p-0">
            <legend className="sr-only">Pestañas</legend>
            {TABS.map((t) => (
              <label key={t.key} className="flex cursor-pointer items-center gap-4 px-5 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="block text-[13px] text-muted">{t.hint}</span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  className="switch"
                  checked={tabs[t.key]}
                  onChange={(e) => setTabs({ ...tabs, [t.key]: e.target.checked })}
                />
              </label>
            ))}
          </fieldset>
        </Section>
      )}

      {step === "moodle" && (
        <Section title="Conecta Moodle" text="Así te salen solas las entregas y los cuestionarios. Si tu universidad no usa Moodle, sáltalo.">
          <MoodleHowTo />
          <LinkInput value={moodle} onChange={setMoodle} placeholder="https://…/calendar/export_execute.php?…" bad={badLink(moodle)} />
        </Section>
      )}

      {step === "outlook" && (
        <Section title="Conecta Outlook" text="Para ver los eventos de tu calendario de Outlook. Si no lo usas, sáltalo.">
          <OutlookHowTo />
          <LinkInput value={outlook} onChange={setOutlook} placeholder="https://outlook.office365.com/owa/calendar/…/calendar.ics" bad={badLink(outlook)} />
        </Section>
      )}

      {step === "done" && (
        <Section title="¡Listo!" text="Esto es lo que has elegido. Lo demás lo añades desde cada pestaña.">
          <ul className="card space-y-2 text-sm">
            <Summary ok={!!name.trim()} text={name.trim() ? `Te saludaremos como ${name.trim()}` : "Sin nombre"} />
            <Summary ok text={`Pestañas: Hoy, ${TABS.filter((t) => tabs[t.key]).map((t) => t.label).join(", ") || "ninguna más"}`} />
            {tabs.moodle && <Summary ok={!!normalizeCalendarUrl(moodle)} text={normalizeCalendarUrl(moodle) ? "Moodle conectado" : "Moodle sin conectar (puedes hacerlo luego en Ajustes)"} />}
            {tabs.outlook && <Summary ok={!!normalizeCalendarUrl(outlook)} text={normalizeCalendarUrl(outlook) ? "Outlook conectado" : "Outlook sin conectar (puedes hacerlo luego en Ajustes)"} />}
          </ul>
          {tabs.calendario && (
            <p className="text-[13px] text-muted">
              Consejo: en <strong className="font-medium text-fg">Calendario → Horario</strong> puedes añadir tus clases y los días sin clase.
            </p>
          )}
        </Section>
      )}

      <div className="flex items-center gap-2">
        {index > 0 && (
          <button type="button" onClick={() => go(-1)} className="btn-ghost" disabled={saving}>
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
            Atrás
          </button>
        )}
        <span className="flex-1" />
        {(step === "moodle" || step === "outlook") && !(step === "moodle" ? moodle : outlook).trim() && (
          <button type="button" onClick={() => go(1)} className="btn-ghost">Saltar</button>
        )}
        {step === "done" ? (
          // Con key distinta para que React no reutilice el botón "Siguiente" (si no, el mismo clic enviaría el formulario).
          <button key="finish" className="btn-primary" disabled={saving}>
            {saving ? "Preparando tu dashboard…" : "Empezar"}
            {!saving && <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />}
          </button>
        ) : (
          <button
            key="next"
            type="button"
            onClick={() => go(1)}
            className="btn-primary"
            disabled={(step === "moodle" && badLink(moodle)) || (step === "outlook" && badLink(outlook))}
          >
            Siguiente
            <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>
    </form>
  );
}

function Section({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-light tracking-[-0.02em]">{title}</h2>
        <p className="text-muted">{text}</p>
      </div>
      {children}
    </section>
  );
}

function LinkInput({ value, onChange, placeholder, bad }: { value: string; onChange: (v: string) => void; placeholder: string; bad: boolean }) {
  return (
    <div className="space-y-1.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Enlace del calendario"
        inputMode="url"
        autoComplete="off"
        className="input w-full"
      />
      {bad && <p className="text-[13px] text-danger">Eso no parece un enlace. Debe empezar por https://</p>}
    </div>
  );
}

function Summary({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex items-start gap-2 ${ok ? "" : "text-muted"}`}>
      <Check className={`mt-0.5 size-4 shrink-0 ${ok ? "text-accent" : "opacity-30"}`} strokeWidth={2} aria-hidden />
      {text}
    </li>
  );
}
