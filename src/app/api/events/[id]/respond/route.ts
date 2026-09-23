import { NextRequest } from "next/server";
import { db } from "@/db";
import { events, responses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage, safeRedirectTarget } from "@/lib/formRedirect";

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
  const redirectTo = safeRedirectTarget(formData.get("redirectTo"), "/events");

  if (status !== "ATTENDING" && status !== "NOT_ATTENDING") {
    return redirectWithMessage(request, redirectTo, { error: "回答が不正です" });
  }

  // 画面上は締切後にフォームを非表示にしているだけなので、直接POSTされた場合に備えて
  // サーバー側でも締切（isOpen=false）を必ず確認する（体験参加者追加と同じガード）。
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    return redirectWithMessage(request, "/events", { error: "イベントが見つかりません" });
  }
  if (!event.isOpen) {
    return redirectWithMessage(request, redirectTo, {
      error: "このイベントは回答受付を締め切っています",
    });
  }

  const [existing] = await db
    .select()
    .from(responses)
    .where(and(eq(responses.eventId, eventId), eq(responses.memberId, member.id)))
    .limit(1);

  if (existing) {
    await db
      .update(responses)
      .set({ status, respondedAt: new Date() })
      .where(eq(responses.id, existing.id));
  } else {
    await db.insert(responses).values({
      id: newId(),
      eventId,
      memberId: member.id,
      status,
    });
  }

  return redirectWithMessage(request, redirectTo, { ok: "回答しました" });
}
