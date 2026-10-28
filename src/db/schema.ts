import { pgTable, pgEnum, serial, integer, smallint, text, date, timestamp, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    ip: text("ip").notNull(),
    ok: boolean("ok").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_attempts_ip_created_idx").on(t.ip, t.createdAt)],
);

export const priorityEnum = pgEnum("priority", ["alta", "media", "baja"]);
export const taskCategoryEnum = pgEnum("task_category", ["tarea", "entrega", "examen", "reunion", "personal"]);

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    notes: text("notes"),
    // Sin fecha = tarea sin vencimiento. Si allDay, dueAt es la medianoche de Madrid de ese día.
    dueAt: timestamp("due_at", { withTimezone: true }),
    allDay: boolean("all_day").notNull().default(true),
    priority: priorityEnum("priority").notNull().default("media"),
    tag: text("tag"),
    category: taskCategoryEnum("category").notNull().default("tarea"),
    // Semanal: se repite cada semana desde dueAt (mismo día y hora). Cada semana se marca aparte en task_completions.
    weekly: boolean("weekly").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tasks_due_idx").on(t.dueAt)],
);

// Semanas hechas de una tarea semanal: una fila por repetición marcada (fecha "YYYY-MM-DD" en Madrid).
export const taskCompletions = pgTable(
  "task_completions",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("task_completions_task_date_idx").on(t.taskId, t.date)],
);

export type Task = typeof tasks.$inferSelect;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type Priority = (typeof priorityEnum.enumValues)[number];
export type TaskCategory = (typeof taskCategoryEnum.enumValues)[number];

export const sourceEnum = pgEnum("source", ["moodle", "outlook"]);
export const itemKindEnum = pgEnum("item_kind", ["entrega", "evento", "correo"]);

// Elementos importados de integraciones. (source, external_id) es único: resincronizar actualiza, no duplica.
export const externalItems = pgTable(
  "external_items",
  {
    id: serial("id").primaryKey(),
    source: sourceEnum("source").notNull(),
    externalId: text("external_id").notNull(),
    kind: itemKindEnum("kind").notNull(),
    title: text("title").notNull(),
    course: text("course"),
    url: text("url"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    allDay: boolean("all_day").notNull().default(false),
    // Estado en origen, p. ej. "pendiente" o "entregada" para Moodle.
    status: text("status"),
    // Marcado como hecho a mano en el dashboard; se conserva entre sincronizaciones.
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("external_items_source_ext_idx").on(t.source, t.externalId),
    index("external_items_starts_idx").on(t.startsAt),
  ],
);

export const integrationStatus = pgTable("integration_status", {
  source: sourceEnum("source").primaryKey(),
  // "api" o "ical": qué vía se usó en la última sincronización.
  mode: text("mode"),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastError: text("last_error"),
  // Aviso no bloqueante, p. ej. "La API falló; se usó el calendario iCal".
  warning: text("warning"),
  itemCount: integer("item_count").notNull().default(0),
});

export type ExternalItem = typeof externalItems.$inferSelect;
export type Source = (typeof sourceEnum.enumValues)[number];

// Horario semanal de clases. Las horas son de Madrid ("HH:mm"); las fechas, días de Madrid.
export const classSlots = pgTable("class_slots", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  // 1 = lunes ... 7 = domingo
  weekday: smallint("weekday").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location"),
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to").notNull(),
});

// Una clase concreta que no se da un día (p. ej. "este viernes no hay Física").
export const classExceptions = pgTable(
  "class_exceptions",
  {
    id: serial("id").primaryKey(),
    slotId: integer("slot_id")
      .notNull()
      .references(() => classSlots.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
  },
  (t) => [uniqueIndex("class_exceptions_slot_date_idx").on(t.slotId, t.date)],
);

// Días sin clase (festivos, puentes, vacaciones). Un solo día: from = to.
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  from: date("from_date").notNull(),
  to: date("to_date").notNull(),
  label: text("label").notNull(),
});

export type Holiday = typeof holidays.$inferSelect;
export type ClassSlot = typeof classSlots.$inferSelect;
export type ClassException = typeof classExceptions.$inferSelect;

// Turnos de trabajo. Sin endAt = fichado y todavía trabajando.
export const workShifts = pgTable(
  "work_shifts",
  {
    id: serial("id").primaryKey(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("work_shifts_start_idx").on(t.startAt)],
);

export type WorkShift = typeof workShifts.$inferSelect;

// Ajustes de la app: una sola fila (id = 1). Si no existe, se usan los valores por defecto y sale la bienvenida.
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull().default(""),
  /** Pestañas desactivadas: "calendario", "tareas", "trabajo", "moodle", "outlook". */
  hiddenTabs: text("hidden_tabs").array().notNull().default([]),
  welcomedAt: timestamp("welcomed_at", { withTimezone: true }),
  /** Contraseña de acceso (scrypt). La crea el asistente la primera vez que se entra. */
  passwordHash: text("password_hash"),
  /** Enlaces de calendario. Se piden en la bienvenida y se cambian en Ajustes. */
  moodleIcalUrl: text("moodle_ical_url"),
  moodleToken: text("moodle_token"),
  moodleUrl: text("moodle_url"),
  outlookIcsUrl: text("outlook_ics_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
