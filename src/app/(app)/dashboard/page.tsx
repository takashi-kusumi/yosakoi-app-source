import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getOpenEventsForMember, getToolsForMember, getRecentNotices } from "@/lib/queries";
import { MembershipStatusBanner } from "@/components/MembershipStatusBanner";
import { EVENT_TYPE_LABELS, formatDateTime } from "@/lib/labels";
import { RespondForm } from "@/components/RespondForm";
import { FlashMessage } from "@/components/FlashMessage";
import { jstTodayKey, jstDateKey } from "@/lib/calendar";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const allOpenEvents = await getOpenEventsForMember(member.id);
  // ホームは「これから回答すべきもの」だけを表示する。日付が過ぎたまま締切忘れのイベントは
  // /events (イベント一覧)の「過去のイベントを表示」から確認できる
  const todayKey = jstTodayKey();
  const openEvents = allOpenEvents.filter(
    (row) => !row.event.eventDate || jstDateKey(row.event.eventDate) >= todayKey
  );
  const tools = await getToolsForMember(member.id);
  const recentNotices = await getRecentNotices(2);
  const unownedCount = tools.filter((t) => !t.owned).length;
  const unanswered = openEvents.filter((row) => !row.response);

  return (
    <div className="space-y-6">
      <FlashMessage ok={ok} error={error} />

      <MembershipStatusBanner membershipStatus={member.membershipStatus} />

      <section>
        <h1 className="text-lg font-bold text-neutral-900">
          こんにちは、{member.displayName}さん
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {unanswered.length > 0
            ? `未回答のイベントが ${unanswered.length} 件あります`
            : "未回答のイベントはありません"}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">回答が必要なイベント</h2>
        {openEvents.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
            現在募集中のイベントはありません
          </p>
        )}
        {openEvents.map(({ event, response }) => (
          <div key={event.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                {EVENT_TYPE_LABELS[event.type] ?? event.type}
              </span>
              <Link href={`/events/${event.id}`} className="text-xs text-neutral-400">
                詳細
              </Link>
            </div>
            <p className="font-semibold text-neutral-900">{event.title}</p>
            <p className="text-sm text-neutral-500">{formatDateTime(event.eventDate)}</p>
            <p className="mb-3 flex items-center gap-1 text-xs text-neutral-400">
              {event.location && (
                <>
                  <span aria-hidden>📍</span>
                  {event.location}
                </>
              )}
            </p>
            <RespondForm
              eventId={event.id}
              currentStatus={response?.status}
              redirectTo="/dashboard"
            />
          </div>
        ))}
      </section>

      {recentNotices.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">最新のお知らせ</h2>
            <Link href="/notices" className="text-xs text-neutral-400">
              すべて見る ›
            </Link>
          </div>
          <ul className="space-y-2">
            {recentNotices.map(({ notice, eventTitle }) => (
              <li key={notice.id}>
                <Link
                  href={`/notices/${notice.id}`}
                  className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
                >
                  {eventTitle && (
                    <span className="mb-1 inline-block rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                      {eventTitle}
                    </span>
                  )}
                  <p className="font-semibold text-neutral-900">{notice.title}</p>
                  <p className="text-xs text-neutral-400">{formatDateTime(notice.createdAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <Link
          href="/tools"
          className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
        >
          <span className="text-sm font-semibold text-neutral-700">道具の保有状況</span>
          <span className="text-xs text-neutral-400">
            {unownedCount === 0 ? "すべて保有済み" : `未保有 ${unownedCount} 件`} ›
          </span>
        </Link>
      </section>
    </div>
  );
}
