import { NextRequest } from "next/server";
import { db } from "@/db";
import { events, eventComments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage, safeRedirectTarget } from "@/lib/formRedirect";
import { MAX_COMMENT_LENGTH } from "@/lib/labels";

/** 予定ごとの質問・コメントの投稿と削除（削除は書いた本人と管理者だけ） */
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
  const action = String(formData.get("action") || "add");
  const back = `${safeRedirectTarget(formData.get("redirectTo"), `/events/${eventId}`)}`;

  const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    return redirectWithMessage(request, "/events", { error: "予定が見つかりません" });
  }

  if (action === "delete") {
    const commentId = String(formData.get("commentId") || "");
    const [comment] = await db.select().from(eventComments).where(eq(eventComments.id, commentId)).limit(1);
    if (!comment || comment.eventId !== eventId) {
      return redirectWithMessage(request, `${back}#comments`, { error: "コメントが見つかりません" });
    }
    if (comment.memberId !== member.id && member.role !== "ADMIN") {
      return redirectWithMessage(request, `${back}#comments`, { error: "このコメントは削除できません" });
    }
    await db.delete(eventComments).where(eq(eventComments.id, commentId));
    return redirectWithMessage(request, `${back}#comments`, { ok: "コメントを削除しました" });
  }

  const body = String(formData.get("body") || "").trim();
  if (!body) {
    return redirectWithMessage(request, `${back}#comments`, { error: "コメントを入力してください" });
  }
  if (body.length > MAX_COMMENT_LENGTH) {
    return redirectWithMessage(request, `${back}#comments`, {
      error: `コメントは${MAX_COMMENT_LENGTH}文字以内で入力してください`,
    });
  }
  await db.insert(eventComments).values({ id: newId(), eventId, memberId: member.id, body });
  return redirectWithMessage(request, `${back}#comments`, { ok: "コメントを投稿しました" });
}
