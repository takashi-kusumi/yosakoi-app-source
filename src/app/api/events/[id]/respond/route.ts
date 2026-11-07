import { NextRequest } from "next/server";
import { db } from "@/db";
import { events, responses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage, safeRedirectTarget } from "@/lib/formRedirect";
import { MAX_RESPONSE_NOTE_LENGTH } from "@/lib/labels";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params;
  const member = await getCurrentMember();
  if (!member) {
    return redirectWithMessage(request, "/login");
  }

  const formData = await request.formData();
  const status = formData.get("status");
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"), `/events/${eventId}`);
  // メモ欄の無いフォーム（ホームのクイック回答）から送られた場合は、既存のメモを消さずに残す
  const hasNote = formData.has("note");
  const note = String(formData.get("note") ?? "").trim().slice(0, MAX_RESPONSE_NOTE_LENGTH);

  if (status !== "ATTENDING" && status !== "NOT_ATTENDING" && status !== "UNDECIDED") {
    return redirectWithMessage(request, redirectTo, { error: "回答が不正です" });
  }

  // 画面上は締切後にフォームを隠しているだけなので、サーバー側でも締切を確認する
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    return redirectWithMessage(request, "/events", { error: "予定が見つかりません" });
  }
  if (!event.isOpen) {
    return redirectWithMessage(request, redirectTo, { error: "この予定は回答受付を締め切っています" });
  }

  const [existing] = await db
    .select()
    .from(responses)
    .where(and(eq(responses.eventId, eventId), eq(responses.memberId, member.id)))
    .limit(1);

  if (existing) {
    await db
      .update(responses)
      .set({ status, respondedAt: new Date(), ...(hasNote ? { note: note || null } : {}) })
      .where(eq(responses.id, existing.id));
  } else {
    await db.insert(responses).values({
      id: newId(),
      eventId,
      memberId: member.id,
      status,
      note: hasNote ? note || null : null,
    });
  }

  return redirectWithMessage(request, redirectTo, { ok: "回答しました" });
}
