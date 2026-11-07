import { NextRequest } from "next/server";
import { db } from "@/db";
import { events, members, responses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage, safeRedirectTarget } from "@/lib/formRedirect";
import { MAX_RESPONSE_NOTE_LENGTH } from "@/lib/labels";

/**
 * 体験参加者（ゲスト）の追加・訂正・削除。
 * - 追加: ログインしているメンバーなら誰でもできる（名前だけで追加。体験者本人はログインしない）
 * - 訂正・削除: 追加した本人と管理者だけ
 */
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
  const back = safeRedirectTarget(formData.get("redirectTo"), `/events/${eventId}`);

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    return redirectWithMessage(request, "/events", { error: "予定が見つかりません" });
  }

  if (action === "add") {
    if (!event.isOpen) {
      return redirectWithMessage(request, back, { error: "この予定は回答受付を締め切っています" });
    }
    const displayName = String(formData.get("displayName") || "").trim().slice(0, 50);
    const note = String(formData.get("note") || "").trim().slice(0, MAX_RESPONSE_NOTE_LENGTH);
    if (!displayName) {
      return redirectWithMessage(request, back, { error: "体験者の名前を入力してください" });
    }

    const [guest] = await db
      .insert(members)
      .values({
        id: newId(),
        displayName,
        role: "MEMBER",
        isActive: true,
        isGuest: true,
        guestAddedBy: member.id,
      })
      .returning();

    await db.insert(responses).values({
      id: newId(),
      eventId,
      memberId: guest.id,
      status: "ATTENDING",
      note: note || null,
    });

    return redirectWithMessage(request, back, { ok: `${displayName}さんを体験者として追加しました` });
  }

  // 訂正・削除は対象のゲストを確認してから
  const guestId = String(formData.get("memberId") || "");
  const [guest] = await db.select().from(members).where(eq(members.id, guestId)).limit(1);
  if (!guest || !guest.isGuest) {
    return redirectWithMessage(request, back, { error: "対象の体験者が見つかりません" });
  }
  const canEdit = member.role === "ADMIN" || guest.guestAddedBy === member.id;
  if (!canEdit) {
    return redirectWithMessage(request, back, {
      error: "体験者の訂正・削除は、追加した人と管理者だけができます",
    });
  }

  if (action === "update") {
    const displayName = String(formData.get("displayName") || "").trim().slice(0, 50);
    const note = String(formData.get("note") || "").trim().slice(0, MAX_RESPONSE_NOTE_LENGTH);
    const status = formData.get("status");
    if (!displayName) {
      return redirectWithMessage(request, back, { error: "名前を入力してください" });
    }
    if (status !== "ATTENDING" && status !== "NOT_ATTENDING") {
      return redirectWithMessage(request, back, { error: "参加状況が不正です" });
    }
    await db
      .update(members)
      .set({ displayName, updatedAt: new Date() })
      .where(eq(members.id, guest.id));
    await db
      .update(responses)
      .set({ status, note: note || null })
      .where(and(eq(responses.eventId, eventId), eq(responses.memberId, guest.id)));
    return redirectWithMessage(request, back, { ok: "体験者の情報を更新しました" });
  }

  if (action === "delete") {
    // members行を削除すると、このイベントの参加記録（responses）もカスケード削除される
    await db.delete(members).where(eq(members.id, guest.id));
    return redirectWithMessage(request, back, { ok: `${guest.displayName}さんを削除しました` });
  }

  return redirectWithMessage(request, back, { error: "操作が不正です" });
}
