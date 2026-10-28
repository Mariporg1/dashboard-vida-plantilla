import type { FetchedItem } from "../types";
import { IntegrationError } from "../types";

type WsError = { exception?: string; errorcode?: string; message?: string };

type ActionEvent = {
  id: number;
  name: string;
  activityname?: string;
  timesort: number;
  url: string;
  modulename?: string;
  instance?: number;
  course?: { fullname: string; shortname: string };
  action?: { actionable: boolean; url: string };
};

type Assignment = { id: number; cmid: number; name: string; duedate: number };
type AssignCourse = { id: number; fullname: string; shortname: string; assignments: Assignment[] };

/** Cliente mínimo de la API REST de servicios web de Moodle. */
export class MoodleClient {
  constructor(
    private baseUrl: string,
    private token: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async call<T>(wsfunction: string, params: Record<string, string | number> = {}): Promise<T> {
    const body = new URLSearchParams({ wstoken: this.token, wsfunction, moodlewsrestformat: "json" });
    for (const [k, v] of Object.entries(params)) body.set(k, String(v));
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/webservice/rest/server.php`, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new IntegrationError("No se pudo conectar con Moodle.");
    }
    if (!res.ok) throw new IntegrationError(`Moodle respondió con un error (HTTP ${res.status}).`);
    const data = (await res.json()) as T & WsError;
    if (data && typeof data === "object" && "exception" in data && data.exception) {
      if (data.errorcode === "invalidtoken") {
        throw new IntegrationError("El token de Moodle no es válido o ha caducado. Genera uno nuevo en Ajustes.");
      }
      throw new IntegrationError(`Moodle: ${data.message ?? data.errorcode}`);
    }
    return data;
  }
}

export async function fetchMoodleApi(client: MoodleClient, baseUrl: string, from: Date, to: Date): Promise<FetchedItem[]> {
  const fromTs = Math.floor(from.getTime() / 1000);
  const toTs = Math.floor(to.getTime() / 1000);

  // 1) Eventos con acción pendiente (lo que Moodle muestra en la "Línea de tiempo"), paginados.
  const events: ActionEvent[] = [];
  let after: number | undefined;
  for (let page = 0; page < 5; page++) {
    const { events: batch } = await client.call<{ events: ActionEvent[] }>("core_calendar_get_action_events_by_timesort", {
      timesortfrom: fromTs,
      timesortto: toTs,
      limitnum: 50,
      ...(after ? { aftereventid: after } : {}),
    });
    events.push(...batch);
    if (batch.length < 50) break;
    after = batch[batch.length - 1].id;
  }

  // Una misma actividad puede traer varios eventos el mismo día (p. ej. "vence" y "se espera completar"
  // con la misma fecha): nos quedamos con uno por actividad y hora.
  const seen = new Set<string>();
  const unique = events.filter((e) => {
    const key = e.instance && e.modulename ? `${e.modulename}:${e.instance}:${e.timesort}` : `${e.activityname || e.name}|${e.course?.fullname}|${e.timesort}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const items: FetchedItem[] = unique.map((e) => ({
    externalId: `event:${e.id}`,
    kind: "entrega",
    title: e.activityname || e.name,
    course: e.course?.fullname ?? null,
    url: e.url || e.action?.url || null,
    startsAt: new Date(e.timesort * 1000),
    endsAt: null,
    allDay: false,
    status: "pendiente",
  }));

  // 2) Tareas con fecha en la ventana que ya no tienen acción pendiente: comprobamos si están entregadas.
  // Algunas versiones de Moodle no rellenan "instance", así que también se reconoce la tarea por el
  // enlace (view.php?id=cmid) o por nombre y fecha, para no duplicarla.
  const pendingAssigns = new Set(events.filter((e) => e.modulename === "assign" && e.instance).map((e) => e.instance));
  const isPending = (a: Assignment) =>
    pendingAssigns.has(a.id) ||
    unique.some(
      (e) =>
        [e.url, e.action?.url].some((u) => u && new RegExp(`[?&]id=${a.cmid}(?:&|$)`).test(u)) ||
        ((e.activityname || e.name) === a.name && e.timesort === a.duedate),
    );
  const { courses } = await client.call<{ courses: AssignCourse[] }>("mod_assign_get_assignments");
  for (const course of courses) {
    for (const a of course.assignments) {
      if (!a.duedate || a.duedate < fromTs || a.duedate > toTs || isPending(a)) continue;
      const status = await client
        .call<{ lastattempt?: { submission?: { status?: string } } }>("mod_assign_get_submission_status", { assignid: a.id })
        .then((s) => (s.lastattempt?.submission?.status === "submitted" ? "entregada" : "pendiente"))
        .catch(() => "pendiente");
      items.push({
        externalId: `assign:${a.id}`,
        kind: "entrega",
        title: a.name,
        course: course.fullname,
        url: `${baseUrl}/mod/assign/view.php?id=${a.cmid}`,
        startsAt: new Date(a.duedate * 1000),
        endsAt: null,
        allDay: false,
        status,
      });
    }
  }
  return items;
}
