import Link from "next/link";
import { getCurrentMember } from "@/lib/auth";
import { getAllEventsForMember } from "@/lib/queries";
import { EVENT_TYPE_OPTIONS, VALID_EVENT_TYPES } from "@/lib/labels";
import { parseMonthParam, monthParam, jstTodayKey, jstDateKey } from "@/lib/calendar";
import { FlashMessage } from "@/components/FlashMessage";
import { MonthCalendar } from "@/components/CalendarView";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/ui";

type Params = { view?: string; month?: string; type?: string; past?: boolean };

function eventsHref(params: Params) {
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
  // 既定は「今後の予定だけ」。スイッチをオンにすると過去の予定も表示する
  const showPast = past === "1";
  const currentMonth = monthParam(y, m);
  const viewName = isCalendar ? "calendar" : "list";

  const typeFilter = VALID_EVENT_TYPES.includes(type as (typeof VALID_EVENT_TYPES)[number])
    ? (type as (typeof VALID_EVENT_TYPES)[number])
    : undefined;
  const typedRows = typeFilter ? allRows.filter((r) => r.event.type === typeFilter) : allRows;

  const todayKey = jstTodayKey();
  const isPast = (r: (typeof typedRows)[number]) => !!r.event.eventDate && jstDateKey(r.event.eventDate) < todayKey;
  const byDate = (a: (typeof typedRows)[number], b: (typeof typedRows)[number]) =>
    (a.event.eventDate?.getTime() ?? Infinity) - (b.event.eventDate?.getTime() ?? Infinity);

  const pastCount = typedRows.filter(isPast).length;
  const rows = showPast ? typedRows : typedRows.filter((r) => !isPast(r));

  const upcomingRows = rows.filter((r) => !isPast(r)).sort(byDate);
  const pastRows = rows.filter(isPast).sort((a, b) => byDate(b, a));
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

  // 今の表示条件を引き継いだリンク
  const current: Params = {
    view: viewName,
    month: isCalendar ? currentMonth : undefined,
    type: typeFilter,
    past: showPast,
  };
  const href = (override: Partial<Params>) => eventsHref({ ...current, ...override });

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

      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">予定</h1>
        <p className="mt-0.5 text-xs text-neutral-400">チームの予定をすべて見られます</p>
      </div>

      <div className="flex rounded-xl bg-neutral-200/60 p-1">
        <Link href={href({ view: "calendar", month: currentMonth })} className={tab(isCalendar)}>
          カレンダー
        </Link>
        <Link href={href({ view: "list", month: undefined })} className={tab(!isCalendar)}>
          リスト
        </Link>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
        <Link href={href({ type: undefined })} className={chip(!typeFilter)}>
          すべて
        </Link>
        {EVENT_TYPE_OPTIONS.map((opt) => (
          <Link key={opt.value} href={href({ type: opt.value })} className={chip(typeFilter === opt.value)}>
            {opt.label}
          </Link>
        ))}
      </div>

      {/* 過去の予定の表示切り替え（スイッチ） */}
      <Link
        href={href({ past: !showPast })}
        role="switch"
        aria-checked={showPast}
        scroll={false}
        className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-2.5 shadow-sm"
      >
        <span className="text-sm font-semibold text-neutral-700">
          過去の予定も表示
          <span className="ml-1.5 text-xs font-normal text-neutral-400">（{pastCount}件）</span>
        </span>
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            showPast ? "bg-orange-600" : "bg-neutral-300"
          }`}
          aria-hidden
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              showPast ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </span>
      </Link>

      {isCalendar ? (
        <>
          <MonthCalendar
            year={y}
            month={m}
            rows={rows}
            monthHref={(mm) => href({ month: mm })}
            dayHref={(key) => `${href({})}#day-${key}`}
          />
          <section className="space-y-2.5">
            <h2 className="text-sm font-bold text-neutral-700">
              {y}年{m}月の{showPast ? "" : "これからの"}予定（{monthRows.length}件）
            </h2>
            {monthRows.length === 0 && (
              <EmptyState>
                {showPast ? "この月の予定はありません" : "この月のこれからの予定はありません"}
              </EmptyState>
            )}
            {monthRows.map(({ event, response }) => {
              const key = jstDateKey(event.eventDate!);
              return (
                <div
                  key={event.id}
                  id={firstIdByDay.get(key) === event.id ? `day-${key}` : undefined}
                  className="scroll-mt-20"
                >
                  <EventCard event={event} status={response?.status} note={response?.note} muted={key < todayKey} />
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
          <section className="space-y-2.5">
            <h2 className="text-sm font-bold text-neutral-700">これからの予定（{upcomingRows.length}件）</h2>
            {upcomingRows.length === 0 && (
              <EmptyState>{typeFilter ? "これからの該当する予定はありません" : "これからの予定はありません"}</EmptyState>
            )}
            {upcomingRows.map(({ event, response }) => (
              <EventCard key={event.id} event={event} status={response?.status} note={response?.note} />
            ))}
          </section>

          {showPast && (
            <section className="space-y-2.5">
              <h2 className="text-sm font-bold text-neutral-500">過去の予定（{pastRows.length}件・新しい順）</h2>
              {pastRows.length === 0 && <EmptyState>過去の予定はありません</EmptyState>}
              {pastRows.map(({ event, response }) => (
                <EventCard key={event.id} event={event} status={response?.status} note={response?.note} muted />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
