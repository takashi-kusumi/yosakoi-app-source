import Link from "next/link";
import { getEventsWithCounts, getLastMinuteChangeCounts } from "@/lib/queries";
import { jstDateKey, jstTodayKey } from "@/lib/calendar";
import { isCalendarSyncConfigured } from "@/lib/googleCalendar";
import { FlashMessage } from "@/components/FlashMessage";
import { EventCard } from "@/components/EventCard";
import { PageTitle } from "@/components/ui";
import { ShareTextCard } from "@/components/ShareTextCard";
import { scheduleShareTemplate } from "@/lib/shareText";
import { getAppUrl } from "@/lib/serverAppUrl";

const tile = "flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 shadow-sm active:scale-[0.99]";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; past?: string }>;
}) {
  const { ok, error, past } = await searchParams;
  const rows = await getEventsWithCounts();
  const todayKey = jstTodayKey();
  const showPast = past === "1";
  const calendarOn = isCalendarSyncConfigured();

  const upcoming = rows
    .filter((r) => !r.event.eventDate || jstDateKey(r.event.eventDate) >= todayKey)
    .sort((a, b) => (a.event.eventDate?.getTime() ?? Infinity) - (b.event.eventDate?.getTime() ?? Infinity));
  const scheduleTemplates = scheduleShareTemplate(
    upcoming.filter((r) => r.event.eventDate).slice(0, 15).map((r) => r.event),
    { appUrl: await getAppUrl() }
  );
  const lastMinuteCounts = await getLastMinuteChangeCounts(upcoming.map((r) => r.event));
  const pastRows = rows.filter((r) => r.event.eventDate && jstDateKey(r.event.eventDate) < todayKey);

  const renderRow = ({ event, counts, activeMemberCount }: (typeof rows)[number], muted = false) => (
    <EventCard
      key={event.id}
      event={event}
      href={`/admin/events/${event.id}`}
      muted={muted}
      rightSlot={
        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          参加 {counts.attending + counts.guestAttending}
        </span>
      }
      footer={
        <p className="mt-1.5 text-[11px] text-neutral-400">
          未定 {counts.undecided} ・ 不参加 {counts.notAttending} ・ 未回答 {Math.max(0, activeMemberCount - counts.total)}
          {counts.guestAttending > 0 && ` ・ うち体験 ${counts.guestAttending}`}
          {!muted && (lastMinuteCounts.get(event.id) ?? 0) > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
              ⚠ 直前の変更 {lastMinuteCounts.get(event.id)}件
            </span>
          )}
        </p>
      }
    />
  );

  return (
    <div className="space-y-5">
      <FlashMessage ok={ok} error={error} />
      <PageTitle>管理</PageTitle>

      <div className="grid grid-cols-2 gap-2.5">
        <Link href="/admin/events/new" className={`${tile} border-orange-200 bg-orange-50`}>
          <span className="text-lg">➕</span>
          <span className="text-sm font-bold text-orange-800">予定を作成</span>
        </Link>
        <Link href="/admin/events/bulk" className={tile}>
          <span className="text-lg">🔁</span>
          <span className="text-sm font-bold text-neutral-800">毎週の予定を一括作成</span>
        </Link>
        <Link href="/admin/notices" className={tile}>
          <span className="text-lg">📢</span>
          <span className="text-sm font-bold text-neutral-800">お知らせ</span>
        </Link>
        <Link href="/admin/surveys" className={tile}>
          <span className="text-lg">📋</span>
          <span className="text-sm font-bold text-neutral-800">アンケート</span>
        </Link>
        <Link href="/admin/members" className={`${tile} col-span-2`}>
          <span className="text-sm font-bold text-neutral-800">👥 メンバー管理</span>
          <span className="text-[11px] text-neutral-400">管理者の設定・利用停止</span>
        </Link>
      </div>

      <section className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="text-sm font-bold text-neutral-800">Googleカレンダー連携</p>
          <p className="text-[11px] text-neutral-400">
            {calendarOn
              ? "有効：予定の作成・変更・削除が自動で反映されます"
              : "未設定（GOOGLE_CALENDAR_ID と GOOGLE_SERVICE_ACCOUNT_JSON を設定すると有効になります）"}
          </p>
        </div>
        {calendarOn && (
          <form action="/api/admin/calendar-sync" method="POST">
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600"
            >
              カレンダーに再反映
            </button>
          </form>
        )}
      </section>

      <ShareTextCard
        title="これからの予定をLINEに貼る"
        description="日時が決まっている今後の予定（最大15件）を一覧にします。"
        templates={scheduleTemplates}
      />

      <section className="space-y-2.5">
        <h2 className="text-sm font-bold text-neutral-700">これからの予定（{upcoming.length}件）</h2>
        {upcoming.length === 0 && (
          <p className="rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-400">
            これからの予定はありません
          </p>
        )}
        {upcoming.map((r) => renderRow(r))}
      </section>

      <Link
        href={showPast ? "/admin" : "/admin?past=1"}
        className="block w-full rounded-xl border border-dashed border-neutral-300 py-2.5 text-center text-xs font-semibold text-neutral-500"
      >
        {showPast ? "過去の予定を隠す ▲" : `過去の予定を表示 ▾（${pastRows.length}件）`}
      </Link>
      {showPast && <div className="space-y-2.5">{pastRows.map((r) => renderRow(r, true))}</div>}
    </div>
  );
}
