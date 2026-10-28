CREATE TYPE "public"."item_kind" AS ENUM('entrega', 'evento', 'correo');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('alta', 'media', 'baja');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('moodle', 'outlook');--> statement-breakpoint
CREATE TYPE "public"."task_category" AS ENUM('tarea', 'entrega', 'examen', 'reunion', 'personal');--> statement-breakpoint
CREATE TABLE "class_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot_id" integer NOT NULL,
	"date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"location" text,
	"valid_from" date NOT NULL,
	"valid_to" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" "source" NOT NULL,
	"external_id" text NOT NULL,
	"kind" "item_kind" NOT NULL,
	"title" text NOT NULL,
	"course" text,
	"url" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"all_day" boolean DEFAULT false NOT NULL,
	"status" text,
	"dismissed_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_status" (
	"source" "source" PRIMARY KEY NOT NULL,
	"mode" text,
	"last_attempt_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error" text,
	"warning" text,
	"item_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"ok" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"hidden_tabs" text[] DEFAULT '{}' NOT NULL,
	"welcomed_at" timestamp with time zone,
	"password_hash" text,
	"moodle_ical_url" text,
	"moodle_token" text,
	"moodle_url" text,
	"outlook_ics_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_completions" (
	"task_id" integer NOT NULL,
	"date" date NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"due_at" timestamp with time zone,
	"all_day" boolean DEFAULT true NOT NULL,
	"priority" "priority" DEFAULT 'media' NOT NULL,
	"tag" text,
	"category" "task_category" DEFAULT 'tarea' NOT NULL,
	"weekly" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_exceptions" ADD CONSTRAINT "class_exceptions_slot_id_class_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."class_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "class_exceptions_slot_date_idx" ON "class_exceptions" USING btree ("slot_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "external_items_source_ext_idx" ON "external_items" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "external_items_starts_idx" ON "external_items" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_created_idx" ON "login_attempts" USING btree ("ip","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "task_completions_task_date_idx" ON "task_completions" USING btree ("task_id","date");--> statement-breakpoint
CREATE INDEX "tasks_due_idx" ON "tasks" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "work_shifts_start_idx" ON "work_shifts" USING btree ("start_at");