import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getAllEventsForMember } from "@/lib/queries";
import { EVENT_TYPE_OPTIONS, VALID_EVENT_TYPES } from "@/lib/labels";
import { parseMonthParam, monthParam, jstTodayKey, jstDateKey } from "@/lib/calendar";
import { FlashMessage } from "@/components/FlashMessage";
import { MonthCalendar } from "@/components/CalendarView";
import { EventCard } from "@/components/EventCard";

function eventsHref(params: { view?: string; month?: string; type?: string; past?: boolean }) {
  const qs = new URLSearchParams();
  if (params.view && params.view !== "calendar") qs.set("view", params.view);
  if (params.month) qs.set("month", params.month);
  if (params.type) qs.set("type", params.type);
  if (params.past) qs.set("past", "1");
  const s = qs.toString();
  return `/events${s ? `?${s}` : ""}`;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    view?: string;
    month?: string;
    type?: string;
    past?: string;
  }>;
}) {
  const { ok, error, view, month, type, past } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const allRows = await getAllEventsForMember(member.id);
  const isCalendar = view !== "list";
  const { y, m } = parseMonthParam(month);
  const showPast = past === "1";
  const currentMonth = monthParam(y, m);

  const typeFilter = VALID_EVENT_TYPES.includes(type as (typeof VALID_EVENT_TYPES)[number])
    ? (type as (typeof VALID_EVENT_TYPES)[number])
    : undefined;
  const rows = typeFilter ? allRows.filter((r) => r.event.type === typeFilter) : allRows;

  const byDate = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
    (a.event.eventDate?.getTime() ?? Infinity) - (b.event.eventDate?.getTime() ?? Infinity);

  const todayKey = jstTodayKey();
  const upcomingRows = rows
    .filter((r) => !r.event.eventDate || jstDateKey(r.event.eventDate) >= todayKey)
    .sort(byDate);
  const pastRows = rows
    .filter((r) => r.event.eventDate && jstDateKey(r.event.eventDate) < todayKey)
    .sort((a, b) => byDate(b, a));
  const monthRows = rows
    .filter((r) => r.event.eventDate && jstDateKey(r.event.eventDate).startsWith(currentMonth))
    .sort(byDate);
  const undatedRows = rows.filter((r) => !r.event.eventDate);

  // カレンダーの日付から飛んできたときの移動先（その日の最初の予定にだけidを振る）
  const firstIdByDay = new Map<string, string>();
  for (const r of monthRows) {
    const key = jstDateKey(r.event.eventDate!);
    if (!firstIdByDay.has(key)) firstIdByDay.set(key, r.event.id);
  }

  const tab = (active: boolean) =>
    `flex-1 rounded-lg py-2 text-center text-sm font-bold transition ${
      active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
    }`;
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
      active ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-500"
    }`;

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />

      <h1 className="text-xl font-bold tracking-tight text-neutral-900">予定</h1>

      <div className="flex rounded-xl bg-neutral-200/60 p-1">
        <Link href={eventsHref({ view: "calendar", month: currentMonth, type: typeFilter })} className={tab(isCalendar)}>
          カレンダー
        </Link>
        <Link href={eventsHref({ view: "list", type: typeFilter })} className={tab(!isCalendar)}>
          リスト
        </Link>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
        <Link
          href={eventsHref({ view: isCalendar ? "calendar" : "list", month: isCalendar ? currentMonth : undefined })}
          className={chip(!typeFilter)}
        >
          すべて
        </Link>
        {EVENT_TYPE_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={eventsHref({
              view: isCalendar ? "calendar" : "list",
              month: isCalendar ? currentMonth : undefined,
              type: opt.value,
            })}
            className={chip(typeFilter === opt.value)}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {isCalendar ? (
        <>
          <MonthCalendar
            year={y}
            month={m}
            rows={rows}
            monthHref={(mm) => eventsHref({ view: "calendar", month: mm, type: typeFilter })}
            dayHref={(key) => `${eventsHref({ view: "calendar", month: currentMonth, type: typeFilter })}#day-${key}`}
          />
          <section className="space-y-2.5">
            <h2 className="text-sm font-bold text-neutral-700">
              {y}年{m}月の予定（{monthRows.length}件）
            </h2>
            {monthRows.length === 0 && (
              <p className="rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-400">
                この月の予定はありません
              </p>
            )}
            {monthRows.map(({ event, response }) => {
              const key = jstDateKey(event.eventDate!);
              return (
                <div
                  key={event.id}
                  id={firstIdByDay.get(key) === event.id ? `day-${key}` : undefined}
                  className="scroll-mt-20"
                >
                  <EventCard
                    event={event}
                    status={response?.status}
                    note={response?.note}
                    muted={key < todayKey}
                  />
                </div>
              );
            })}
          </section>
          {undatedRows.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="text-sm font-bold text-neutral-700">日時未定</h2>
              {undatedRows.map(({ event, response }) => (
                <EventCard key={event.id} event={event} status={response?.status} note={response?.note} />
              ))}
            </section>
          )}
        </>
      ) : (
        <>
          {upcomingRows.length === 0 && (
            <p className="rounded-2xl border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-400">
              {typeFilter ? "これからの該当する予定はありません" : "これからの予定はありません"}
            </p>
          )}
          <div className="space-y-2.5">
            {upcomingRows.map(({ event, response }) => (
              <EventCard key={event.id} event={event} status={response?.status} note={response?.note} />
            ))}
          </div>

          <Link
            href={eventsHref({ view: "list", type: typeFilter, past: !showPast })}
            className="block w-full rounded-xl border border-dashed border-neutral-300 py-2.5 text-center text-xs font-semibold text-neutral-500"
          >
            {showPast ? "過去の予定を隠す ▲" : `過去の予定を表示 ▾（${pastRows.length}件）`}
          </Link>

          {showPast && (
            <div className="space-y-2.5">
              {pastRows.map(({ event, response }) => (
                <EventCard key={event.id} event={event} status={response?.status} note={response?.note} muted />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
