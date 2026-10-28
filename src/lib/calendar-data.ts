import { asc } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { holidays } from "@/db/schema";
import { makeCalendar } from "./academic-calendar";

/** Calendario con los días sin clase guardados (una consulta por petición). */
export const loadCalendar = cache(async () => makeCalendar(await db.select().from(holidays).orderBy(asc(holidays.from))));
