import "server-only";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncEventToCalendar, type SyncResult } from "@/lib/googleCalendar";

/** 予定1件をGoogleカレンダーに反映し、結果のIDを保存する */
export async function syncEventById(eventId: string, appUrl: string): Promise<SyncResult> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return { status: "skipped" };
  const result = await syncEventToCalendar(event, appUrl);
  if (result.status === "ok" && result.googleCalendarEventId !== event.googleCalendarEventId) {
    await db
      .update(events)
      .set({ googleCalendarEventId: result.googleCalendarEventId })
      .where(eq(events.id, eventId));
  }
  return result;
}
