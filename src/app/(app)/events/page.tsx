import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getAllEventsForMember } from "@/lib/queries";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_OPTIONS,
  VALID_EVENT_TYPES,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  UNANSWERED_BADGE_CLASS,
  formatDateTime,
} from "@/lib/labels";
import { parseMonthParam, monthParam, jstTodayKey, jstDateKey } from "@/lib/calendar";
import { FlashMessage } from "@/components/FlashMessage";
import { CalendarView } from "@/components/CalendarView";

function eventsHref(params: { view?: string; month?: string; type?: string; past?: boolean }) {
  const qs = new URLSearchParams();
  if (params.view) qs.set("view", params.view);
  if (params.month) qs.set("month", params.month);
  if (params.type) qs.set("type", params.type);
  if (params.past) qs.set("past", "1");
  const s = qs.toString();
  return `/events${s ? `?${s}` : ""}`;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; view?: string; month?: string; type?: string; past?: string }>;
}) {
  const { ok, error, view, month, type, past } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const allRows = await getAllEventsForMember(member.id);
  const isCalendar = view !== "list";
  const { y, m } = parseMonthParam(month);
  const showPast = past === "1";

  const typeFilter = VALID_EVENT_TYPES.includes(type as (typeof VALID_EVENT_TYPES)[number])
    ? (type as (typeof VALID_EVENT_TYPES)[number])
    : undefined;
  const rows = typeFilter ? allRows.filter((r) => r.event.type === typeFilter) : allRows;

  const currentView = isCalendar ? "calendar" : "list";
  const currentMonth = monthParam(y, m);

  const todayKey = jstTodayKey();
  // 日時未定(eventDateがnull)のイベントは「過去」に埋もれさせず、常に今後の一覧側に出す
  const upcomingRows = rows
    .filter((r) => !r.event.eventDate || jstDateKey(r.event.eventDate) >= todayKey)
    .sort((a, b) => (a.event.eventDate?.getTime() ?? Infinity) - (b.event.eventDate?.getTime() ?? Infinity));
  const pastRows = rows
    .filter((r) => r.event.eventDate && jstDateKey(r.event.eventDate) < todayKey)
    .sort((a, b) => (b.event.eventDate?.getTime() ?? 0) - (a.event.eventDate?.getTime() ?? 0));

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-neutral-900">イベント一覧</h1>
        <div className="flex rounded-lg border border-neutral-200 bg-white p-0.5 text-xs">
          <Link
            href={eventsHref({ view: "calendar", month: currentMonth, type: typeFilter })}
            className={`rounded-md px-3 py-1.5 font-semibold ${
              isCalendar ? "bg-orange-600 text-white" : "text-neutral-500"
            }`}
          >
            カレンダー
          </Link>
          <Link
            href={eventsHref({ view: "list", type: typeFilter })}
            className={`rounded-md px-3 py-1.5 font-semibold ${
              !isCalendar ? "bg-orange-600 text-white" : "text-neutral-500"
            }`}
          >
            リスト
          </Link>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5 text-xs">
        <Link
          href={eventsHref({ view: currentView, month: currentMonth })}
          className={`shrink-0 rounded-full border px-3 py-1.5 font-semibold ${
            !typeFilter
              ? "border-orange-600 bg-orange-600 text-white"
              : "border-neutral-200 bg-white text-neutral-500"
          }`}
        >
          すべて
        </Link>
        {EVENT_TYPE_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={eventsHref({ view: currentView, month: currentMonth, type: opt.value })}
            className={`shrink-0 rounded-full border px-3 py-1.5 font-semibold ${
              typeFilter === opt.value
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-neutral-200 bg-white text-neutral-500"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {isCalendar ? (
        <CalendarView year={y} month={m} rows={rows} />
      ) : (
        <>
          {upcomingRows.length === 0 && (
            <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
              {typeFilter ? "今後の該当イベントはありません" : "今後のイベントはありません"}
            </p>
          )}
          <ul className="space-y-3">
            {upcomingRows.map(({ event, response }) => (
              <EventListItem key={event.id} event={event} response={response} />
            ))}
          </ul>

          <div className="pt-1">
            <Link
              href={eventsHref({ view: currentView, month: currentMonth, type: typeFilter, past: !showPast })}
              className="block w-full rounded-xl border border-dashed border-neutral-300 px-4 py-2.5 text-center text-xs font-semibold text-neutral-500"
            >
              {showPast ? "過去のイベントを隠す ▲" : `過去のイベントを表示 ▾ (${pastRows.length}件)`}
            </Link>
          </div>

          {showPast && (
            <div className="space-y-3">
              <p className="pt-1 text-xs font-semibold text-neutral-400">過去のイベント</p>
              {pastRows.length === 0 && (
                <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
                  過去のイベントはありません
                </p>
              )}
              <ul className="space-y-3 opacity-70">
                {pastRows.map(({ event, response }) => (
                  <EventListItem key={event.id} event={event} response={response} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventListItem({
  event,
  response,
}: {
  event: { id: string; type: string; title: string; eventDate: Date | null; location: string | null; isOpen: boolean };
  response?: { status: keyof typeof STATUS_LABEL } | null;
}) {
  return (
    <li>
      <Link
        href={`/events/${event.id}`}
        className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
      >
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
              {EVENT_TYPE_LABELS[event.type] ?? event.type}
            </span>
            {!event.isOpen && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                締切
              </span>
            )}
          </div>
          <p className="font-semibold text-neutral-900">{event.title}</p>
          <p className="text-xs text-neutral-500">{formatDateTime(event.eventDate)}</p>
          {event.location && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
              <span aria-hidden>📍</span>
              {event.location}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            response ? STATUS_BADGE_CLASS[response.status] : UNANSWERED_BADGE_CLASS
          }`}
        >
          {response ? STATUS_LABEL[response.status] : "未回答"}
        </span>
      </Link>
    </li>
  );
}
