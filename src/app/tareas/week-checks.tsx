"use client";

import { useOptimistic, useTransition } from "react";
import { toggleOccurrence } from "./actions";

export type WeekCheck = { date: string; label: string; done: boolean; past: boolean };

/** Desplegable con las semanas del mes de una tarea semanal; cada una se marca por separado. */
export function WeekChecks({ taskId, weeks, monthLabel }: { taskId: number; weeks: WeekCheck[]; monthLabel: string }) {
  const [, start] = useTransition();
  const [state, setState] = useOptimistic(weeks, (cur, date: string) => cur.map((w) => (w.date === date ? { ...w, done: !w.done } : w)));
  const doneCount = state.filter((w) => w.done).length;

  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-muted">
        Semanas de {monthLabel}: <span className="text-fg tabular-nums">{doneCount}/{state.length}</span> hechas
      </summary>
      {state.length === 0 ? (
        <p className="mt-1 text-muted">Este mes no le toca ninguna semana.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {state.map((w) => (
            <li key={w.date}>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={w.done}
                  onChange={() =>
                    start(async () => {
                      setState(w.date);
                      await toggleOccurrence(taskId, w.date);
                    })
                  }
                  className="check check-sm"
                />
                <span className={w.done ? "line-through text-muted" : w.past ? "text-danger" : ""}>{w.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
