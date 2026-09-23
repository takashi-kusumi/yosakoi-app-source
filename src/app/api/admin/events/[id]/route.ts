import { NextRequest } from "next/server";
import { db } from "@/db";
import { events, members, responses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { redirectWithMessage, safeRedirectTarget } from "@/lib/formRedirect";
import { VALID_EVENT_TYPES as VALID_TYPES, parseJstDatetimeLocal } from "@/lib/labels";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params;
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const action = formData.get("action");
  const redirectTo = safeRedirectTarget(
    formData.get("redirectTo"),
    `/admin/events/${eventId}`
  );

  if (action === "close") {
    await db.update(events).set({ isOpen: false, updatedAt: new Date() }).where(eq(events.id, eventId));
  } else if (action === "reopen") {
    await db.update(events).set({ isOpen: true, updatedAt: new Date() }).where(eq(events.id, eventId));
  } else if (action === "update") {
    const type = formData.get("type");
    const title = String(formData.get("title") || "").trim();
    const eventDateRaw = String(formData.get("eventDate") || "").trim();
    const location = String(formData.get("location") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const feeAmountRaw = String(formData.get("feeAmount") || "").trim();

    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number]) || !title) {
      return redirectWithMessage(request, `/admin/events/${eventId}/edit`, {
        error: "種類とタイトルは必須です",
      });
    }

    let feeAmount: number | null = null;
    if (feeAmountRaw) {
      const parsed = Number(feeAmountRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return redirectWithMessage(request, `/admin/events/${eventId}/edit`, {
          error: "参加費が不正です",
        });
      }
      feeAmount = parsed;
    }

    const eventDate = parseJstDatetimeLocal(eventDateRaw);

    await db
      .update(events)
      .set({
        type: type as (typeof VALID_TYPES)[number],
        title,
        eventDate,
        location: location || null,
        description: description || null,
        feeAmount,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    return redirectWithMessage(request, `/admin/events/${eventId}`, { ok: "更新しました" });
  } else if (action === "toggleFeePaid") {
    const memberId = String(formData.get("memberId") || "");
    const [existing] = await db
      .select()
      .from(responses)
      .where(and(eq(responses.eventId, eventId), eq(responses.memberId, memberId)))
      .limit(1);
    if (existing) {
      const nextPaid = !existing.feePaid;
      await db
        .update(responses)
        .set({ feePaid: nextPaid, feePaidAt: nextPaid ? new Date() : null })
        .where(eq(responses.id, existing.id));
    }
    return redirectWithMessage(request, `/admin/events/${eventId}`, {
      ok: "参加費の状況を更新しました",
    });
  } else if (action === "updateGuest") {
    // 体験参加者（ゲスト）の名前・このイベントでの参加状況を訂正する。
    // isGuest=false のメンバーはここでは一切変更できないようにガードする。
    const memberId = String(formData.get("memberId") || "");
    const displayName = String(formData.get("displayName") || "").trim();
    const status = formData.get("status");

    const [guest] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (!guest || !guest.isGuest) {
      return redirectWithMessage(request, `/admin/events/${eventId}`, {
        error: "対象の体験参加者が見つかりません",
      });
    }
    if (!displayName) {
      return redirectWithMessage(request, `/admin/events/${eventId}`, {
        error: "名前を入力してください",
      });
    }
    if (status !== "ATTENDING" && status !== "NOT_ATTENDING") {
      return redirectWithMessage(request, `/admin/events/${eventId}`, {
        error: "参加状況が不正です",
      });
    }

    await db
      .update(members)
      .set({ displayName, updatedAt: new Date() })
      .where(eq(members.id, memberId));

    await db
      .update(responses)
      .set({ status })
      .where(and(eq(responses.eventId, eventId), eq(responses.memberId, memberId)));

    return redirectWithMessage(request, `/admin/events/${eventId}`, {
      ok: "体験参加者の情報を更新しました",
    });
  } else if (action === "deleteGuest") {
    // 体験参加者（ゲスト）の記録を削除する。members行を削除すると、responses（このイベントの
    // 参加記録）はカスケード削除される。isGuest=false のメンバーは削除できないようにガードする。
    const memberId = String(formData.get("memberId") || "");
    const [guest] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (!guest || !guest.isGuest) {
      return redirectWithMessage(request, `/admin/events/${eventId}`, {
        error: "対象の体験参加者が見つかりません",
      });
    }

    await db.delete(members).where(eq(members.id, memberId));

    return redirectWithMessage(request, `/admin/events/${eventId}`, {
      ok: `${guest.displayName}さんの体験参加記録を削除しました`,
    });
  }

  return redirectWithMessage(request, redirectTo);
}
