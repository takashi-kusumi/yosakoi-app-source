import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEventWithResponses } from "@/lib/queries";
import { pushLineMessage, resolveAppUrl } from "@/lib/line";
import { EVENT_TYPE_LABELS, formatDateTime } from "@/lib/labels";
import { redirectWithMessage } from "@/lib/formRedirect";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const formData = await request.formData();
  const eventId = String(formData.get("eventId") || "");
  const target = formData.get("target");
  const customMessage = String(formData.get("message") || "").trim();

  if (!eventId || (target !== "unanswered" && target !== "answered")) {
    return redirectWithMessage(request, "/admin", { error: "パラメーターが不正です" });
  }

  const detail = await getEventWithResponses(eventId);
  if (!detail) {
    return redirectWithMessage(request, "/admin", { error: "イベントが見つかりません" });
  }

  const appUrl = resolveAppUrl(request.nextUrl.origin);
  const eventLabel = EVENT_TYPE_LABELS[detail.event.type] ?? detail.event.type;
  const dateLabel = formatDateTime(detail.event.eventDate);

  const defaultUnansweredMessage = `【リマインド】${detail.event.title}（${eventLabel} / ${dateLabel}）の出欠回答がまだです。アプリから回答をお願いします。\n${appUrl}/events/${eventId}`;
  const defaultAnsweredMessage = `【ご連絡】${detail.event.title}（${eventLabel} / ${dateLabel}）について運営からの連絡です。詳しくはアプリをご確認ください。\n${appUrl}/events/${eventId}`;

  const recipients =
    target === "unanswered"
      ? detail.unanswered
      : detail.answered.map((a) => a.member);

  const message =
    customMessage || (target === "unanswered" ? defaultUnansweredMessage : defaultAnsweredMessage);

  let sent = 0;
  let skippedNoLine = 0;
  let failed = 0;

  for (const member of recipients) {
    if (!member.lineUserId) {
      skippedNoLine++;
      continue;
    }
    const result = await pushLineMessage(member.lineUserId, message);
    if (result.ok) {
      sent++;
    } else {
      failed++;
    }
  }

  return redirectWithMessage(request, `/admin/events/${eventId}`, {
    ok: `送信完了: 成功${sent}件 / 失敗${failed}件 / LINE未連携${skippedNoLine}件`,
  });
}
