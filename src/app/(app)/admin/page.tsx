import Link from "next/link";
import { getEventsWithCounts } from "@/lib/queries";
import { jstDateKey, jstTodayKey } from "@/lib/calendar";
import { FlashMessage } from "@/components/FlashMessage";
import { EventCard } from "@/components/EventCard";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; past?: string }>;
}) {
  const { ok, error, past } = await searchParams;
  const rows = await getEventsWithCounts();
  const todayKey = jstTodayKey();
  const showPast = past === "1";

  const upcoming = rows
    .filter((r) => !r.event.eventDate || jstDateKey(r.event.eventDate) >= todayKey)
    .sort(
      (a, b) => (a.event.eventDate?.getTime() ?? Infinity) - (b.event.eventDate?.getTime() ?? Infinity)
    );
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
          未定 {counts.undecided} ・ 不参加 {counts.notAttending} ・ 未回答{" "}
          {Math.max(0, activeMemberCount - counts.total)}
          {counts.guestAttending > 0 && ` ・ うち体験 ${counts.guestAttending}`}
        </p>
      }
    />
  );

  return (
    <div className="space-y-5">
      <FlashMessage ok={ok} error={error} />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">管理</h1>
        <Link
          href="/admin/events/new"
          className="rounded-full bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-orange-600/20"
        >
          ＋ 予定を作成
        </Link>
      </div>

      <Link
        href="/admin/members"
        className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 shadow-sm"
      >
        <div>
          <p className="text-sm font-bold text-neutral-800">メンバー管理</p>
          <p className="text-xs text-neutral-400">管理者の設定・利用停止</p>
        </div>
        <span className="text-neutral-300">›</span>
      </Link>

      <section className="space-y-2.5">
        <h2 className="text-sm font-bold text-neutral-700">これからの予定（{upcoming.length}件）</h2>
        {upcoming.length === 0 && (
          <p className="rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-400">
            これからの予定はありません。「＋ 予定を作成」から追加してください。
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
