import { NextRequest } from "next/server";
import { db } from "@/db";
import { events, responses } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { redirectWithMessage } from "@/lib/formRedirect";
import { isEventOpen, MAX_RESPONSE_NOTE_LENGTH } from "@/lib/labels";
import { saveResponse } from "@/lib/responses";

type Status = "ATTENDING" | "NOT_ATTENDING" | "UNDECIDED";
const VALID: Status[] = ["ATTENDING", "NOT_ATTENDING", "UNDECIDED"];

/** 複数の予定への回答をまとめて保存する（変わったものだけ保存し、締切済みの予定は飛ばす） */
export async function POST(request: NextRequest) {
  const member = await getCurrentMember();
  if (!member) {
    return redirectWithMessage(request, "/login");
  }

  const formData = await request.formData();
  const answers = new Map<string, { status: Status; note: string }>();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("status_") || typeof value !== "string" || !VALID.includes(value as Status)) continue;
    const eventId = key.slice("status_".length);
    const note = String(formData.get(`note_${eventId}`) ?? "").trim().slice(0, MAX_RESPONSE_NOTE_LENGTH);
    answers.set(eventId, { status: value as Status, note });
  }
  if (answers.size === 0) {
    return redirectWithMessage(request, "/events/answer", { error: "回答が選ばれていません" });
  }

  const ids = [...answers.keys()];
  const targetEvents = await db.select().from(events).where(inArray(events.id, ids));
  const existing = await db
    .select()
    .from(responses)
    .where(and(eq(responses.memberId, member.id), inArray(responses.eventId, ids)));
  const existingByEvent = new Map(existing.map((r) => [r.eventId, r]));

  let saved = 0;
  let closed = 0;
  for (const event of targetEvents) {
    const answer = answers.get(event.id)!;
    if (!isEventOpen(event)) {
      closed++;
      continue;
    }
    const prev = existingByEvent.get(event.id);
    if (prev && prev.status === answer.status && (prev.note ?? "") === answer.note) continue;
    await saveResponse({
      eventId: event.id,
      memberId: member.id,
      status: answer.status,
      note: answer.note || null,
      changedBy: member.id,
      proxyBy: null,
    });
    saved++;
  }

  if (saved === 0 && closed > 0) {
    return redirectWithMessage(request, "/events/answer", { error: "選んだ予定は回答の受付が終了していました" });
  }
  if (saved === 0 && closed === 0) {
    return redirectWithMessage(request, "/dashboard", { ok: "回答に変更はありませんでした" });
  }
  return redirectWithMessage(request, "/dashboard", {
    ok: `${saved}件の回答を保存しました${closed > 0 ? `（${closed}件は受付終了のため保存できませんでした）` : ""}`,
  });
}
