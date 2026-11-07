import { NextRequest } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { newId } from "@/lib/id";
import { redirectWithMessage } from "@/lib/formRedirect";
import { resolveAppUrl } from "@/lib/appUrl";
import { syncEventById } from "@/lib/eventSync";
import { CALENDAR_ERROR_NOTE } from "@/lib/googleCalendar";
import { VALID_EVENT_TYPES as VALID_TYPES, parseJstDatetimeLocal, resolveEndDate } from "@/lib/labels";
import { addDaysKey, datesForWeekdays, MAX_BULK_EVENTS } from "@/lib/recurrence";


const BACK = "/admin/events/bulk";

/** 毎週の練習などを、曜日と期間を指定してまとめて作成する */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }

  const f = await request.formData();
  const type = f.get("type");
  const title = String(f.get("title") || "").trim();
  const weekdays = f
    .getAll("weekdays")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const fromKey = String(f.get("from") || "");
  const toKey = String(f.get("to") || "");
  const startTime = String(f.get("startTime") || "");
  const endTime = String(f.get("endTime") || "");
  const location = String(f.get("location") || "").trim();
  const description = String(f.get("description") || "").trim();
  const feeRaw = String(f.get("feeAmount") || "").trim();
  const deadlineRule = String(f.get("deadlineRule") || "none");

  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number]) || !title) {
    return redirectWithMessage(request, BACK, { error: "種類とタイトルは必須です" });
  }
  if (weekdays.length === 0) {
    return redirectWithMessage(request, BACK, { error: "曜日を1つ以上選んでください" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromKey) || !/^\d{4}-\d{2}-\d{2}$/.test(toKey) || fromKey > toKey) {
    return redirectWithMessage(request, BACK, { error: "期間を正しく入力してください（開始日 ≦ 終了日）" });
  }
  if (!/^\d{2}:\d{2}$/.test(startTime)) {
    return redirectWithMessage(request, BACK, { error: "開始時刻を入力してください" });
  }
  let feeAmount: number | null = null;
  if (feeRaw) {
    const n = Number(feeRaw);
    if (!Number.isFinite(n) || n < 0) return redirectWithMessage(request, BACK, { error: "参加費が不正です" });
    feeAmount = n;
  }

  const dates = datesForWeekdays(fromKey, toKey, weekdays, MAX_BULK_EVENTS);
  if (dates.length === 0) {
    return redirectWithMessage(request, BACK, { error: "期間内に該当する曜日の日がありません" });
  }
  if (dates.length > MAX_BULK_EVENTS) {
    return redirectWithMessage(request, BACK, {
      error: `一度に作成できるのは${MAX_BULK_EVENTS}件までです。期間を短くしてください`,
    });
  }

  const appUrl = resolveAppUrl(request.nextUrl.origin);
  let calendarFailed = false;
  for (const key of dates) {
    const eventDate = parseJstDatetimeLocal(`${key}T${startTime}`);
    const endDate = resolveEndDate(eventDate, endTime);
    const responseDeadline =
      deadlineRule === "prev21"
        ? new Date(`${addDaysKey(key, -1)}T21:00:00+09:00`)
        : deadlineRule === "prev2_21"
          ? new Date(`${addDaysKey(key, -2)}T21:00:00+09:00`)
          : null;
    const id = newId();
    await db.insert(events).values({
      id,
      type: type as (typeof VALID_TYPES)[number],
      title,
      eventDate,
      endDate,
      responseDeadline,
      location: location || null,
      description: description || null,
      feeAmount,
    });
    const sync = await syncEventById(id, appUrl);
    if (sync.status === "error") calendarFailed = true;
  }

  return redirectWithMessage(request, "/admin", {
    ok: `${dates.length}件の予定を作成しました${calendarFailed ? CALENDAR_ERROR_NOTE : ""}`,
  });
}
