import { NextRequest } from "next/server";
import { db } from "@/db";
import { events, responses, eventPhotos, members } from "@/db/schema";
import { deleteObject } from "@/lib/storage";
import { resolveAppUrl } from "@/lib/appUrl";
import { syncEventById } from "@/lib/eventSync";
import { CALENDAR_ERROR_NOTE, removeEventFromCalendar } from "@/lib/googleCalendar";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { redirectWithMessage, safeRedirectTarget } from "@/lib/formRedirect";
import {
  VALID_EVENT_TYPES as VALID_TYPES,
  MAX_RESPONSE_NOTE_LENGTH,
  parseJstDatetimeLocal,
  resolveEndDate,
} from "@/lib/labels";
import { saveResponse } from "@/lib/responses";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await context.params;
  let admin;
  try {
    admin = await requireAdmin();
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
    return redirectWithMessage(request, redirectTo, { ok: "回答の受付を締め切りました" });
  } else if (action === "reopen") {
    await db.update(events).set({ isOpen: true, updatedAt: new Date() }).where(eq(events.id, eventId));
    return redirectWithMessage(request, redirectTo, { ok: "回答の受付を再開しました" });
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
    const endDate = resolveEndDate(eventDate, String(formData.get("endTime") || ""));
    const responseDeadline = parseJstDatetimeLocal(String(formData.get("responseDeadline") || ""));

    await db
      .update(events)
      .set({
        type: type as (typeof VALID_TYPES)[number],
        title,
        eventDate,
        endDate,
        responseDeadline,
        location: location || null,
        description: description || null,
        feeAmount,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    const sync = await syncEventById(eventId, resolveAppUrl(request.nextUrl.origin));
    return redirectWithMessage(request, `/admin/events/${eventId}`, {
      ok: `更新しました${sync.status === "error" ? CALENDAR_ERROR_NOTE : ""}`,
    });
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
  } else if (action === "proxyRespond") {
    // 管理者がメンバーの代わりに回答を入力する（締切後・受付終了後でも入力できる）
    const memberId = String(formData.get("memberId") || "");
    const status = formData.get("status");
    const note = String(formData.get("note") ?? "").trim().slice(0, MAX_RESPONSE_NOTE_LENGTH);
    if (status !== "ATTENDING" && status !== "NOT_ATTENDING" && status !== "UNDECIDED") {
      return redirectWithMessage(request, `/admin/events/${eventId}#proxy`, { error: "回答を選んでください" });
    }
    const [ev] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId)).limit(1);
    if (!ev) {
      return redirectWithMessage(request, "/admin", { error: "予定が見つかりません" });
    }
    const [target] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (!target || target.isGuest || !target.isActive) {
      return redirectWithMessage(request, `/admin/events/${eventId}#proxy`, { error: "メンバーを選んでください" });
    }
    await saveResponse({
      eventId,
      memberId,
      status,
      note: note || null,
      changedBy: admin.id,
      proxyBy: admin.id,
    });
    return redirectWithMessage(request, `/admin/events/${eventId}`, {
      ok: `${target.displayName}さんの回答を代理で入力しました`,
    });
  } else if (action === "delete") {
    // 出欠の回答・写真の記録もカスケード削除される。写真ファイル本体はストレージからも消す
    const [target] = await db
      .select({ googleCalendarEventId: events.googleCalendarEventId })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    const photos = await db
      .select({ objectKey: eventPhotos.objectKey })
      .from(eventPhotos)
      .where(eq(eventPhotos.eventId, eventId));
    await db.delete(events).where(eq(events.id, eventId));
    for (const p of photos) {
      try {
        await deleteObject(p.objectKey);
      } catch (err) {
        console.error("deleteObject failed", err);
      }
    }
    const removed = await removeEventFromCalendar(target?.googleCalendarEventId ?? null);
    return redirectWithMessage(request, "/admin", {
      ok: `予定を削除しました${removed.status === "error" ? "（Googleカレンダーからの削除に失敗しました。カレンダー側で削除してください）" : ""}`,
    });
  }

  return redirectWithMessage(request, redirectTo);
}
