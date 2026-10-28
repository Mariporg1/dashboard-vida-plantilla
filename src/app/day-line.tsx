import { madridTime } from "@/lib/dates";

export type DayPoint = { key: string; label: string; start: Date; end?: Date | null; color: string; kind: "class" | "item" };

const minutes = (d: Date) => {
  const [h, m] = madridTime(d).split(":").map(Number);
  return h * 60 + m;
};

/**
 * La línea del día: de la mañana a la noche, con las clases como tramos, lo que tiene hora como nodos
 * y "ahora" como el nodo verde. Inspirada en el diagrama de capas de la referencia.
 */
export function DayLine({ points, now, label }: { points: DayPoint[]; now: Date; label: string }) {
  const nowMin = minutes(now);
  const all = [...points.map((p) => minutes(p.start)), ...points.filter((p) => p.end).map((p) => minutes(p.end!)), nowMin];
  const from = Math.min(7 * 60, Math.floor(Math.min(...all) / 60) * 60);
  const to = Math.max(23 * 60, Math.ceil(Math.max(...all) / 60) * 60);
  const pct = (m: number) => ((m - from) / (to - from)) * 100;
  const pos = (m: number) => `${pct(m)}%`;
  const hours: number[] = [];
  for (let h = Math.ceil(from / 60); h <= to / 60; h += 2) hours.push(h);

  // Varias cosas a la misma hora (p. ej. tres entregas a las 23:59) van en un solo nodo: "Práctica 2 +2".
  const sorted: (DayPoint & { more: number })[] = [];
  for (const p of [...points].sort((a, b) => a.start.getTime() - b.start.getTime())) {
    const prev = sorted.at(-1);
    if (prev && p.kind === "item" && prev.kind === "item" && minutes(prev.start) === minutes(p.start)) prev.more++;
    else sorted.push({ ...p, more: 0 });
  }

  return (
    <figure className="no-scrollbar -mx-5 overflow-x-auto px-8" aria-label={label}>
      <div className="relative h-40 min-w-[640px]">
        {/* La línea */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--control)]" />

        {/* Horas */}
        {hours.map((h) => (
          <span
            key={h}
            className="absolute bottom-0 -translate-x-1/2 text-[11px] tabular-nums text-muted"
            style={{ left: pos(h * 60) }}
          >
            {String(h).padStart(2, "0")}:00
          </span>
        ))}

        {/* Clases (tramos) y cosas con hora (nodos), con la etiqueta alternando arriba y abajo */}
        {sorted.map((p, i) => {
          const start = minutes(p.start);
          const end = p.end ? minutes(p.end) : null;
          const past = (end ?? start) < nowMin;
          const up = i % 2 === 0;
          // Cerca del final, la etiqueta crece hacia la izquierda para no salirse.
          const flip = pct(start) > 82;
          return (
            <div key={p.key} className={past ? "opacity-40" : ""}>
              {end !== null && p.kind === "class" ? (
                <span
                  className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
                  style={{ left: pos(start), width: `calc(${pos(end)} - ${pos(start)})`, background: p.color }}
                />
              ) : (
                <span
                  className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-surface"
                  style={{ left: pos(start), borderColor: p.color }}
                />
              )}
              {/* Conector fino hasta la etiqueta */}
              <span
                className={`absolute w-px bg-line ${up ? "bottom-1/2 h-6" : "top-1/2 h-6"}`}
                style={{ left: pos(start) }}
              />
              <span
                className={`absolute w-max max-w-40 text-[12px] leading-tight ${up ? "top-[calc(50%-3.4rem)]" : "top-[calc(50%+1.6rem)]"} ${flip ? "-translate-x-full text-right" : ""}`}
                style={{ left: pos(start) }}
                title={p.label}
              >
                <span className={`flex font-medium ${flip ? "justify-end" : ""}`}>
                  <span className="truncate">{p.label}</span>
                  {p.more > 0 && <span className="shrink-0 pl-1 font-normal text-muted">+{p.more}</span>}
                </span>
                <span className="block tabular-nums text-muted">
                  {madridTime(p.start)}
                  {end !== null && `–${madridTime(p.end!)}`}
                </span>
              </span>
            </div>
          );
        })}

        {/* Ahora */}
        <span className="absolute inset-y-3 w-px bg-accent/50" style={{ left: pos(nowMin) }} aria-hidden />
        <span
          className="absolute top-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent-soft/25"
          style={{ left: pos(nowMin) }}
          aria-label={`Ahora, ${madridTime(now)}`}
          role="img"
        >
          <span className="size-2.5 rounded-full bg-accent-soft ring-2 ring-surface" />
        </span>
      </div>
    </figure>
  );
}
