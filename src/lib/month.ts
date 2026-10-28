import { addDays } from "./dates";
import { weekStart } from "./schedule";

/** Semanas (lunes a domingo) que cubren el mes "YYYY-MM", como listas de claves "YYYY-MM-DD". */
export function monthWeeks(month: string): string[][] {
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const weeks: string[][] = [];
  for (let mon = weekStart(first); mon <= last; mon = addDays(mon, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(mon, i)));
  }
  return weeks;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
