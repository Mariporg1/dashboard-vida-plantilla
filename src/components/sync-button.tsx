"use client";

import { useState, useTransition } from "react";
import type { Source } from "@/db/schema";
import { RefreshCw } from "lucide-react";
import { syncNow } from "@/app/sync-actions";

export function SyncButton({ sources }: { sources?: Source[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
      <button
        className="btn-primary h-9 whitespace-nowrap px-4"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const res = await syncNow(sources);
            const failed = res.filter((r) => !r.ok && !r.skipped);
            setMsg(failed.length ? "Algo ha fallado, mira el aviso." : "Sincronizado.");
          });
        }}
      >
        <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} strokeWidth={2} aria-hidden />
        {pending ? "Sincronizando…" : "Sincronizar ahora"}
      </button>
      {msg && <span className="text-xs sm:text-sm text-muted" role="status">{msg}</span>}
    </div>
  );
}
