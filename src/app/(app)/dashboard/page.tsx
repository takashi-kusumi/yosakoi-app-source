import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import {
  getAllEventsForMember,
  getUpcomingOpenEventsForMember,
  getUnreadNotices,
  getSurveysForMember,
} from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";
import { EventCard } from "@/components/EventCard";
import { MonthCalendar } from "@/components/CalendarView";
import { NoticeListItem } from "@/components/NoticeListItem";
import { ListLinkCard } from "@/components/ui";
import { jstDateKey, jstTodayKey, parseMonthParam } from "@/lib/calendar";
import { deadlineLabel, formatEventDate, isSurveyOpen, STATUS_LABEL } from "@/lib/labels";

function daysUntilLabel(date: Date): string {
  const diff = Math.round(
    (new Date(`${jstDateKey(date)}T00:00:00Z`).getTime() - new Date(`${jstTodayKey()}T00:00:00Z`).getTime()) /
      (24 * 60 * 60 * 1000)
  );
  if (diff <= 0) return "今日";
  if (diff === 1) return "明日";
  return `あと${diff}日`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; month?: string }>;
}) {
  const { ok, error, month } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const [upcoming, allRows, unreadNotices, surveyRows] = await Promise.all([
    getUpcomingOpenEventsForMember(member.id),
    getAllEventsForMember(member.id),
    getUnreadNotices(member.lastSeenNoticesAt, 3),
    getSurveysForMember(member.id),
  ]);

  // 回答が必要な予定（締切が近い順 → 日付順）
  const unanswered = upcoming
    .filter((r) => !r.response)
    .sort(
      (a, b) =>
        (a.event.responseDeadline?.getTime() ?? a.event.eventDate?.getTime() ?? Infinity) -
        (b.event.responseDeadline?.getTime() ?? b.event.eventDate?.getTime() ?? Infinity)
    );
  // 次に参加する予定（今日以降で「参加」と回答しているもののうち一番近いもの）
  const todayKey = jstTodayKey();
  const nextAttending = allRows
    .filter(
      (r) =>
        r.response?.status === "ATTENDING" && r.event.eventDate && jstDateKey(r.event.eventDate) >= todayKey
    )
    .sort((a, b) => a.event.eventDate!.getTime() - b.event.eventDate!.getTime())[0];
  const pendingSurveys = surveyRows.filter((r) => !r.answered && isSurveyOpen(r.survey));

  const todoCount = unanswered.length + pendingSurveys.length;
  const { y, m } = parseMonthParam(month);
  const redirectTo = month ? `/dashboard?month=${month}` : "/dashboard";

  return (
    <div className="space-y-6">
      <FlashMessage ok={ok} error={error} />

      <section>
        <p className="text-xs font-medium text-neutral-400">こんにちは</p>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">{member.displayName}さん</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {todoCount > 0 ? (
            <>
              回答が必要なものが <span className="font-bold text-amber-700">{todoCount}件</span> あります
            </>
          ) : (
            "回答が必要なものはありません 🎉"
          )}
        </p>
      </section>

      {/* 1. 回答が必要な予定 */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-800">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            回答してください
            {unanswered.length > 0 && <span className="text-xs font-semibold text-amber-700">{unanswered.length}件</span>}
          </h2>
          {unanswered.length >= 2 && (
            <Link href="/events/answer" className="text-xs font-semibold text-orange-600">
              まとめて回答 ›
            </Link>
          )}
        </div>
        {unanswered.length >= 2 && (
          <Link
            href="/events/answer"
            className="flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 active:scale-[0.99]"
          >
            <span>
              <span className="block text-sm font-bold text-orange-800">📝 {unanswered.length}件をまとめて回答する</span>
              <span className="text-[11px] text-orange-700/80">1画面で選んで、最後に一度だけ保存できます</span>
            </span>
            <span className="text-orange-400">›</span>
          </Link>
        )}
        {unanswered.length === 0 ? (
          <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-center text-sm font-medium text-emerald-700">
            募集中の予定は、すべて回答済みです
          </p>
        ) : (
          unanswered.map(({ event, response }) => (
            <EventCard
              key={event.id}
              event={event}
              status={response?.status}
              note={response?.note}
              quickRespond={{ redirectTo }}
            />
          ))
        )}
      </section>

      {/* 2. 次に参加する予定 */}
      {nextAttending && (
        <section className="space-y-2.5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            次に参加する予定
          </h2>
          <Link
            href={`/events/${nextAttending.event.id}`}
            className="block rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-5 text-white shadow-md shadow-orange-600/20 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-orange-100">{formatEventDate(nextAttending.event.eventDate, nextAttending.event.endDate)}</p>
                <p className="mt-1 truncate text-lg font-bold">{nextAttending.event.title}</p>
                {nextAttending.event.location && (
                  <p className="mt-0.5 truncate text-xs text-orange-100">📍 {nextAttending.event.location}</p>
                )}
                {nextAttending.response?.note && (
                  <p className="mt-1 truncate text-xs text-orange-100">💬 {nextAttending.response.note}</p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold">
                {daysUntilLabel(nextAttending.event.eventDate!)}
              </span>
            </div>
            <p className="mt-3 text-[11px] font-semibold text-orange-100">
              あなたの回答: {STATUS_LABEL[nextAttending.response!.status]} ・ タップで詳細
            </p>
          </Link>
        </section>
      )}

      {/* 3. 回答待ちのアンケート */}
      {pendingSurveys.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-800">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            アンケートに回答してください
          </h2>
          {pendingSurveys.map(({ survey }) => (
            <ListLinkCard key={survey.id} href={`/surveys/${survey.id}`} highlight>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] font-bold text-neutral-900">📋 {survey.title}</p>
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">未回答</span>
              </div>
              {deadlineLabel(survey.closesAt) && (
                <p className="mt-1 text-[11px] font-semibold text-amber-700">⏰ {deadlineLabel(survey.closesAt)}</p>
              )}
            </ListLinkCard>
          ))}
        </section>
      )}

      {/* 4. 新着のお知らせ */}
      {unreadNotices.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-neutral-800">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              新着のお知らせ
            </h2>
            <Link href="/notices" className="text-xs font-semibold text-orange-600">
              すべて見る ›
            </Link>
          </div>
          {unreadNotices.map(({ notice, eventTitle }) => (
            <NoticeListItem key={notice.id} notice={notice} eventTitle={eventTitle} unread />
          ))}
        </section>
      )}

      {/* 5. カレンダー（全体の予定は「予定」タブで） */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-800">カレンダー</h2>
          <Link href="/events?view=list" className="text-xs font-semibold text-orange-600">
            予定の一覧 ›
          </Link>
        </div>
        <MonthCalendar
          year={y}
          month={m}
          rows={allRows}
          monthHref={(mm) => `/dashboard?month=${mm}`}
          dayHref={(key) => `/events?month=${key.slice(0, 7)}${key < todayKey ? "&past=1" : ""}#day-${key}`}
        />
      </section>
    </div>
  );
}
