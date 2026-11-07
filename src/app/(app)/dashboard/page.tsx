import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getAllEventsForMember, getUpcomingOpenEventsForMember } from "@/lib/queries";
import { FlashMessage } from "@/components/FlashMessage";
import { EventCard } from "@/components/EventCard";
import { MonthCalendar } from "@/components/CalendarView";
import { parseMonthParam } from "@/lib/calendar";

const HOME_LIMIT = 6;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; month?: string }>;
}) {
  const { ok, error, month } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const [upcoming, allRows] = await Promise.all([
    getUpcomingOpenEventsForMember(member.id),
    getAllEventsForMember(member.id),
  ]);
  const unansweredCount = upcoming.filter((r) => !r.response).length;
  const shown = upcoming.slice(0, HOME_LIMIT);
  const { y, m } = parseMonthParam(month);
  const redirectTo = month ? `/dashboard?month=${month}` : "/dashboard";

  return (
    <div className="space-y-5">
      <FlashMessage ok={ok} error={error} />

      <section className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-neutral-400">こんにちは</p>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">{member.displayName}さん</h1>
        </div>
        {unansweredCount > 0 ? (
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
            未回答 {unansweredCount}件
          </span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            すべて回答済み
          </span>
        )}
      </section>

      <MonthCalendar
        year={y}
        month={m}
        rows={allRows}
        monthHref={(mm) => `/dashboard?month=${mm}`}
        dayHref={(key) => `/events?month=${key.slice(0, 7)}#day-${key}`}
      />

      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-700">これからの予定</h2>
          <Link href="/events?view=list" className="text-xs font-semibold text-orange-600">
            すべて見る ›
          </Link>
        </div>
        {shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-400">
            募集中の予定はありません
          </p>
        ) : (
          <div className="space-y-2.5">
            {shown.map(({ event, response }) => (
              <EventCard
                key={event.id}
                event={event}
                status={response?.status}
                note={response?.note}
                quickRespond={{ redirectTo }}
              />
            ))}
          </div>
        )}
        {upcoming.length > HOME_LIMIT && (
          <Link
            href="/events?view=list"
            className="block rounded-xl border border-neutral-200 bg-white py-2.5 text-center text-xs font-semibold text-neutral-500"
          >
            ほか {upcoming.length - HOME_LIMIT}件の予定を見る
          </Link>
        )}
      </section>
    </div>
  );
}
