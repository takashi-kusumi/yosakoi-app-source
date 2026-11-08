import "server-only";
import { db } from "@/db";
import { responses, responseChanges } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { newId } from "@/lib/id";
import { jstDateKey } from "@/lib/calendar";
import { addDaysKey } from "@/lib/recurrence";

type Status = "ATTENDING" | "NOT_ATTENDING" | "UNDECIDED";

/**
 * 出欠の回答を保存し、回答が変わった場合は変更履歴に残す。
 * - note: undefined ならメモは変更しない（ホームのクイック回答など）
 * - proxyBy: 管理者が代理入力した場合はその管理者のID。本人の回答ならnull
 */
export async function saveResponse(params: {
  eventId: string;
  memberId: string;
  status: Status;
  note?: string | null;
  changedBy: string;
  proxyBy: string | null;
}) {
  const { eventId, memberId, status, note, changedBy, proxyBy } = params;
  const [existing] = await db
    .select()
    .from(responses)
    .where(and(eq(responses.eventId, eventId), eq(responses.memberId, memberId)))
    .limit(1);

  if (existing) {
    await db
      .update(responses)
      .set({ status, respondedAt: new Date(), proxyBy, ...(note !== undefined ? { note } : {}) })
      .where(eq(responses.id, existing.id));
  } else {
    await db.insert(responses).values({
      id: newId(),
      eventId,
      memberId,
      status,
      note: note ?? null,
      proxyBy,
    });
  }

  if (!existing || existing.status !== status) {
    await db.insert(responseChanges).values({
      id: newId(),
      eventId,
      memberId,
      fromStatus: existing?.status ?? null,
      toStatus: status,
      changedBy,
    });
  }
}

/**
 * 「直前の変更」の判定: 予定の前日0時（日本時間）以降、または回答締切の後に行われた変更。
 * 日時未定の予定では、締切後の変更だけを対象にする。
 */
export function lastMinuteSince(event: { eventDate: Date | null; responseDeadline: Date | null }): Date | null {
  const candidates: Date[] = [];
  if (event.eventDate) {
    candidates.push(new Date(`${addDaysKey(jstDateKey(event.eventDate), -1)}T00:00:00+09:00`));
  }
  if (event.responseDeadline) candidates.push(event.responseDeadline);
  if (candidates.length === 0) return null;
  return new Date(Math.min(...candidates.map((d) => d.getTime())));
}
