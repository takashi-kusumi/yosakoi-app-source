import { NextRequest } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { redirectWithMessage, safeRedirectTarget } from "@/lib/formRedirect";
import { MAX_RESPONSE_NOTE_LENGTH, isEventOpen } from "@/lib/labels";
import { saveResponse } from "@/lib/responses";

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
  if (!isEventOpen(event)) {
    return redirectWithMessage(request, redirectTo, { error: "この予定は回答受付を締め切っています" });
  }

  await saveResponse({
    eventId,
    memberId: member.id,
    status,
    note: hasNote ? note || null : undefined,
    changedBy: member.id,
    proxyBy: null,
  });

  return redirectWithMessage(request, redirectTo, { ok: "回答しました" });
}
