"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/wordmark";

/** Inicio de sesión o, la primera vez, creación de la contraseña. */
export function LoginForm({ firstTime }: { firstTime: boolean }) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (firstTime && password !== repeat) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const res = await fetch(firstTime ? "/api/auth/setup" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "No se pudo iniciar sesión");
    setLoading(false);
  }

  return (
    <main className="flex min-h-dvh flex-col bg-bg">
      <div className="bg-bar px-4 text-[var(--bar-fg)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center text-lg">
          <Wordmark />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-[2.25rem] font-light leading-[1.05] tracking-[-0.035em]">{firstTime ? "Hola. Empecemos." : "Hola de nuevo."}</h1>
            <p className="mt-2 text-sm text-muted">
              {firstTime
                ? "Crea la contraseña con la que entrarás a tu dashboard. Solo la sabrás tú; apúntala en un sitio seguro."
                : "Entra para ver tu día."}
            </p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-[13px] text-muted">{firstTime ? "Nueva contraseña (mínimo 8 caracteres)" : "Contraseña"}</span>
            <input
              type="password"
              autoComplete={firstTime ? "new-password" : "current-password"}
              autoFocus
              required
              minLength={firstTime ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
            />
          </label>
          {firstTime && (
            <label className="block space-y-1.5">
              <span className="text-[13px] text-muted">Repítela</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                className="input w-full"
              />
            </label>
          )}
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (firstTime ? "Creando…" : "Entrando…") : firstTime ? "Crear contraseña" : "Entrar"}
            {!loading && <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />}
          </button>
        </form>
      </div>
    </main>
  );
}
