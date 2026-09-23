import Link from "next/link";
import {
  buildMonthCells,
  jstDateKey,
  addMonths,
  monthParam,
  WEEKDAY_LABELS,
} from "@/lib/calendar";
import {
  EVENT_TYPE_LABELS,
  STATUS_DOT_CLASS,
  UNANSWERED_DOT_CLASS,
  STATUS_BADGE_CLASS,
  UNANSWERED_BADGE_CLASS,
  STATUS_LABEL,
  formatDateTime,
} from "@/lib/labels";

type EventRow = {
  event: {
    id: string;
    type: string;
    title: string;
    eventDate: Date | string | null;
    location?: string | null;
    isOpen: boolean;
  };
  response: { status: string } | null;
};

function dotClass(row: EventRow): string {
  if (row.response) return STATUS_DOT_CLASS[row.response.status] ?? "bg-neutral-300";
  return UNANSWERED_DOT_CLASS;
}

function badgeClass(row: EventRow): string {
  if (row.response) return STATUS_BADGE_CLASS[row.response.status] ?? "bg-neutral-100 text-neutral-500";
  return UNANSWERED_BADGE_CLASS;
}

function badgeLabel(row: EventRow): string {
  if (row.response) return STATUS_LABEL[row.response.status] ?? row.response.status;
  return "未回答";
}

export function CalendarView({
  year,
  month,
  rows,
}: {
  year: number;
  month: number;
  rows: EventRow[];
}) {
  const cells = buildMonthCells(year, month);
  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);

  const dated = rows.filter((r) => r.event.eventDate);
  const undated = rows.filter((r) => !r.event.eventDate);

  const byDay = new Map<string, EventRow[]>();
  for (const row of dated) {
    const key = jstDateKey(new Date(row.event.eventDate as string | Date));
    const list = byDay.get(key) ?? [];
    list.push(row);
    byDay.set(key, list);
  }

  const monthEvents = dated
    .filter((r) => jstDateKey(new Date(r.event.eventDate as string | Date)).startsWith(monthParam(year, month)))
    .sort(
      (a, b) =>
        new Date(a.event.eventDate as string | Date).getTime() -
        new Date(b.event.eventDate as string | Date).getTime()
    );

  // カレンダーの日付タップ時のジャンプ先（同じ日の最初のイベントにだけid="day-YYYY-MM-DD"を振る）
  const firstEventIdByDay = new Map<string, string>();
  for (const row of monthEvents) {
    const dayKey = jstDateKey(new Date(row.event.eventDate as string | Date));
    if (!firstEventIdByDay.has(dayKey)) firstEventIdByDay.set(dayKey, row.event.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <Link
          href={`/events?view=calendar&month=${monthParam(prev.y, prev.m)}`}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-50"
        >
          ‹
        </Link>
        <p className="text-sm font-bold text-neutral-800">
          {year}年{month}月
        </p>
        <Link
          href={`/events?view=calendar&month=${monthParam(next.y, next.m)}`}
          className="rounded-lg px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-50"
        >
          ›
        </Link>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-neutral-400">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((cell) => {
            const dayRows = byDay.get(cell.key) ?? [];
            const cellClass = `flex min-h-14 flex-col items-center gap-1 rounded-lg py-1 ${
              cell.isToday ? "bg-orange-50" : ""
            } ${dayRows.length > 0 ? "active:bg-orange-100" : ""}`;
            const content = (
              <>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    cell.isToday
                      ? "bg-orange-600 font-bold text-white"
                      : cell.inMonth
                      ? "text-neutral-700"
                      : "text-neutral-300"
                  }`}
                >
                  {cell.day}
                </span>
                <div className="flex flex-wrap justify-center gap-0.5 px-0.5">
                  {dayRows.slice(0, 3).map((row) => (
                    <span
                      key={row.event.id}
                      className={`h-1.5 w-1.5 rounded-full ${dotClass(row)}`}
                    />
                  ))}
                  {dayRows.length > 3 && (
                    <span className="text-[9px] leading-none text-neutral-400">+{dayRows.length - 3}</span>
                  )}
                </div>
              </>
            );
            // 予定がある日は、下の「今月の予定」一覧の該当箇所へジャンプできるようにする
            return dayRows.length > 0 ? (
              <a key={cell.key} href={`#day-${cell.key}`} className={cellClass}>
                {content}
              </a>
            ) : (
              <div key={cell.key} className={cellClass}>
                {content}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[11px] text-neutral-500 shadow-sm">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-orange-600" />
          参加
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-neutral-400" />
          不参加
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          未回答
        </span>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-neutral-700">
          {year}年{month}月の予定
        </h2>
        {monthEvents.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-5 text-center text-sm text-neutral-400">
            この月の予定はありません
          </p>
        )}
        <ul className="space-y-2">
          {monthEvents.map((row) => {
            const dayKey = jstDateKey(new Date(row.event.eventDate as string | Date));
            const anchorId = firstEventIdByDay.get(dayKey) === row.event.id ? `day-${dayKey}` : undefined;
            return (
            <li key={row.event.id} id={anchorId} className="scroll-mt-4">
              <Link
                href={`/events/${row.event.id}`}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dotClass(row)}`} />
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                      {EVENT_TYPE_LABELS[row.event.type] ?? row.event.type}
                    </span>
                  </div>
                  <p className="font-semibold text-neutral-900">{row.event.title}</p>
                  <p className="text-xs text-neutral-500">{formatDateTime(row.event.eventDate)}</p>
                  {row.event.location && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                      <span aria-hidden>📍</span>
                      {row.event.location}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(row)}`}>
                  {badgeLabel(row)}
                </span>
              </Link>
            </li>
            );
          })}
        </ul>
      </section>

      {undated.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-700">日程未定</h2>
          <ul className="space-y-2">
            {undated.map((row) => (
              <li key={row.event.id}>
                <Link
                  href={`/events/${row.event.id}`}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div>
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                      {EVENT_TYPE_LABELS[row.event.type] ?? row.event.type}
                    </span>
                    <p className="mt-1 font-semibold text-neutral-900">{row.event.title}</p>
                    {row.event.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                        <span aria-hidden>📍</span>
                        {row.event.location}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(row)}`}>
                    {badgeLabel(row)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
