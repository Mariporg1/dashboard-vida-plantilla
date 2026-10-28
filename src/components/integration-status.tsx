import Link from "next/link";
import type { integrationStatus } from "@/db/schema";

type Status = typeof integrationStatus.$inferSelect | undefined;

const fmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", dateStyle: "medium", timeStyle: "short" });

/** Última sincronización y avisos de una integración. */
export function IntegrationStatus({ label, status, configured }: { label: string; status: Status; configured: boolean }) {
  if (!configured) {
    return (
      <p className="notice notice-warn">
        {label} no está conectado todavía. Pega su enlace en{" "}
        <Link href="/ajustes" className="underline underline-offset-2">Ajustes</Link>.
      </p>
    );
  }
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted">
        Última sincronización correcta:{" "}
        <strong className="text-fg font-medium">{status?.lastSuccessAt ? fmt.format(status.lastSuccessAt) : "nunca"}</strong>
        {status?.mode && <> · vía {status.mode === "api" ? "API" : "calendario iCal"}</>}
      </p>
      {status?.lastError && (
        <p className="notice notice-error" role="alert">
          No se pudo sincronizar {label}: {status.lastError}
          {status.lastSuccessAt && " Se muestran los datos de la última sincronización correcta."}
        </p>
      )}
      {!status?.lastError && status?.warning && <p className="notice notice-warn">{status.warning}</p>}
    </div>
  );
}
