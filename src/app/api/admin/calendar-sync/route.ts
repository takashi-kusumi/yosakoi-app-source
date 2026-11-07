import { NextRequest } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { gte } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { redirectWithMessage } from "@/lib/formRedirect";
import { resolveAppUrl } from "@/lib/appUrl";
import { syncEventById } from "@/lib/eventSync";
import { isCalendarSyncConfigured } from "@/lib/googleCalendar";
import { jstTodayKey } from "@/lib/calendar";

/** 今日以降の予定を、まとめてGoogleカレンダーに反映し直す（連携を後から設定した場合や、失敗したときの再実行用） */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return redirectWithMessage(request, "/dashboard", { error: "管理者のみ操作できます" });
  }
  if (!isCalendarSyncConfigured()) {
    return redirectWithMessage(request, "/admin", { error: "Googleカレンダー連携の設定がまだ完了していません" });
  }

  const todayStart = new Date(`${jstTodayKey()}T00:00:00+09:00`);
  const targets = await db.select({ id: events.id }).from(events).where(gte(events.eventDate, todayStart));
  const appUrl = resolveAppUrl(request.nextUrl.origin);
  let ok = 0;
  let failed = 0;
  for (const t of targets) {
    const r = await syncEventById(t.id, appUrl);
    if (r.status === "ok") ok++;
    else if (r.status === "error") failed++;
  }
  return redirectWithMessage(
    request,
    "/admin",
    failed > 0
      ? { error: `${ok}件を反映しました（${failed}件は失敗しました）` }
      : { ok: `今日以降の予定 ${ok}件をGoogleカレンダーに反映しました` }
  );
}
