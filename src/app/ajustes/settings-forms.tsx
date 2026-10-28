"use client";

import { startTransition, useActionState, useEffect, useOptimistic, useRef, useTransition } from "react";
import type { TabKey } from "@/lib/tab-list";
import { changePassword, saveLink, saveName, setTab, type FormState, type LinkKind } from "./actions";

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveName, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input name="name" defaultValue={name} maxLength={40} placeholder="Tu nombre" aria-label="Tu nombre" className="input min-w-0 flex-1" />
      <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
      {state.error && <p className="w-full text-sm text-danger" role="alert">{state.error}</p>}
      {state.ok && !pending && <p className="w-full text-[13px] text-muted" role="status">Guardado. Así te saluda Hoy.</p>}
    </form>
  );
}

/** Enlace de un calendario: se guarda y se sincroniza al momento. Vacío lo desconecta. */
export function LinkForm({ kind, url, placeholder }: { kind: LinkKind; url?: string; placeholder: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveLink.bind(null, kind), {});
  return (
    <form
      onSubmit={(e) => {
        // Sin el reset automático de React 19: el enlace se queda escrito aunque haya error.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input name="url" defaultValue={url} placeholder={placeholder} aria-label="Enlace del calendario" inputMode="url" autoComplete="off" className="input min-w-0 flex-1" />
      <button className="btn-primary" disabled={pending}>{pending ? "Comprobando…" : "Guardar"}</button>
      {state.error && <p className="w-full text-sm text-danger" role="alert">{state.error}</p>}
      {state.ok && !pending && <p className="w-full text-[13px] text-muted" role="status">Guardado y sincronizado.</p>}
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-2 sm:grid-cols-3">
      <input type="password" name="current" required autoComplete="current-password" placeholder="Contraseña actual" aria-label="Contraseña actual" className="input w-full" />
      <input type="password" name="next" required minLength={8} autoComplete="new-password" placeholder="Nueva (mín. 8)" aria-label="Nueva contraseña" className="input w-full" />
      <input type="password" name="repeat" required autoComplete="new-password" placeholder="Repite la nueva" aria-label="Repite la nueva contraseña" className="input w-full" />
      <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Cambiar contraseña"}</button>
        {state.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
        {state.ok && !pending && <p className="text-[13px] text-muted" role="status">Contraseña cambiada.</p>}
      </div>
    </form>
  );
}

/** Interruptor de una pestaña: cambia al momento y se guarda detrás. */
export function TabSwitch({ tab, label, on }: { tab: TabKey; label: string; on: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(on);
  const [, start] = useTransition();
  return (
    <input
      type="checkbox"
      role="switch"
      className="switch"
      aria-label={`Pestaña ${label}`}
      checked={optimistic}
      onChange={(e) => {
        const next = e.target.checked;
        start(async () => {
          setOptimistic(next);
          await setTab(tab, next);
        });
      }}
    />
  );
}
