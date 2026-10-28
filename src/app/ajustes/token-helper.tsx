"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { extractToken } from "@/integrations/moodle/token";
import { saveMoodleToken } from "./actions";

// Ayuda para sacar el token de la app móvil cuando el Moodle entra con SSO (inicio de sesión de la universidad).
export function TokenHelper({ moodleUrl, hasToken }: { moodleUrl?: string; hasToken: boolean }) {
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const token = link ? extractToken(link) : null;
  const launch = moodleUrl ? `${moodleUrl}/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=12345&urlscheme=moodlemobile` : null;

  const save = (value: string | null) =>
    start(async () => {
      const r = await saveMoodleToken(value);
      setMsg(r.error ?? (value ? "Token guardado. Ya se ve qué entregas has hecho." : "Token quitado."));
      if (r.ok) setLink("");
    });

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">
        Ver también qué entregas has hecho (opcional, avanzado)
        <ChevronDown className="size-4 text-muted transition-transform duration-200 group-open:rotate-180" strokeWidth={1.75} aria-hidden />
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <p className="text-muted">
          Con el calendario ya ves todas las fechas. Si además quieres que desaparezca solo lo que ya has entregado, hace falta un token de
          la app móvil de Moodle. No funciona en todas las universidades.
        </p>
        {hasToken && (
          <p className="flex flex-wrap items-center gap-2">
            Tienes un token guardado.
            <button type="button" className="btn-ghost text-sm" onClick={() => save(null)} disabled={pending}>Quitarlo</button>
          </p>
        )}
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-muted">
          <li>En el ordenador (Chrome o Edge), inicia sesión en tu Moodle.</li>
          <li>Abre una pestaña nueva, pulsa <strong className="font-medium text-fg">F12</strong>, ve a <strong className="font-medium text-fg">Network</strong> (Red) y marca <strong className="font-medium text-fg">Preserve log</strong>.</li>
          <li>
            En esa pestaña abre esta dirección (cópiala y pégala arriba):{" "}
            {launch ? <code className="select-all break-all rounded-md bg-raised px-1.5">{launch}</code> : "primero conecta el calendario de Moodle"}.
            Parecerá que no pasa nada.
          </li>
          <li>
            En Network pulsa la fila <code>launch.php</code> y, en <em>Response Headers</em>, copia el valor de <code>Location</code> (empieza por{" "}
            <code>moodlemobile://token=</code>). Pégalo aquí.
          </li>
        </ol>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="moodlemobile://token=..." className="input w-full" />
        {link && !token && <p className="text-danger">Ese enlace no contiene un token válido.</p>}
        {token && (
          <button type="button" className="btn-primary" onClick={() => save(token)} disabled={pending}>
            {pending ? "Guardando…" : "Guardar token"}
          </button>
        )}
        {msg && <p className="text-[13px] text-muted" role="status">{msg}</p>}
      </div>
    </details>
  );
}
