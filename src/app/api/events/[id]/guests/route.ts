import { NextRequest } from "next/server";
import { db } from "@/db";
import { events, members, responses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";

/**
 * 体験参加者（ゲスト）をイベントに追加する。
 * LINEログインしていない人でも、既存の正部員が名前だけでこのイベントの参加者として登録できる。
 * 作成されたゲストはアプリにログインすることはなく、このイベントの参加記録としてのみ存在する。
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
  if (member.membershipStatus !== "REGULAR") {
    return redirectWithMessage(request, `/events/${eventId}`, {
      error: "体験参加者の追加は正部員のみ行えます",
    });
  }

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) {
    return redirectWithMessage(request, "/events", { error: "イベントが見つかりません" });
  }
  if (!event.isOpen) {
    return redirectWithMessage(request, `/events/${eventId}`, {
      error: "このイベントは回答受付を締め切っています",
    });
  }

  const formData = await request.formData();
  const displayName = String(formData.get("displayName") || "").trim();
  if (!displayName) {
    return redirectWithMessage(request, `/events/${eventId}`, {
      error: "体験参加者の名前を入力してください",
    });
  }

  const [guest] = await db
    .insert(members)
    .values({
      id: newId(),
      lineUserId: null,
      displayName,
      role: "MEMBER",
      isActive: true,
      isGuest: true,
      membershipStatus: "TRIAL",
    })
    .returning();

  await db.insert(responses).values({
    id: newId(),
    eventId,
    memberId: guest.id,
    status: "ATTENDING",
  });

  return redirectWithMessage(request, `/events/${eventId}`, {
    ok: `${displayName}さんを体験参加者として追加しました`,
  });
}
