import Link from "next/link";
import { buildMonthCells, jstDateKey, addMonths, monthParam, WEEKDAY_LABELS } from "@/lib/calendar";
import { STATUS_DOT_CLASS, UNANSWERED_DOT_CLASS } from "@/lib/labels";

export type CalendarRow = {
  event: { id: string; type: string; title: string; eventDate: Date | string | null; isOpen: boolean };
  response: { status: string } | null;
};

function dotClass(row: CalendarRow): string {
  if (row.response) return STATUS_DOT_CLASS[row.response.status] ?? "bg-neutral-300";
  return UNANSWERED_DOT_CLASS;
}

/**
 * 月カレンダー（グリッドのみ）。予定のある日には、自分の回答状況の色の点を出す。
 * - monthHref: 前月・翌月へのリンク先を作る関数
 * - dayHref: 予定のある日をタップしたときのリンク先（その日の予定が1件だけならそのまま詳細へ）
 */
export function MonthCalendar({
  year,
  month,
  rows,
  monthHref,
  dayHref,
}: {
  year: number;
  month: number;
  rows: CalendarRow[];
  monthHref: (month: string) => string;
  dayHref: (dayKey: string) => string;
}) {
  const cells = buildMonthCells(year, month);
  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);

  const byDay = new Map<string, CalendarRow[]>();
  for (const row of rows) {
    if (!row.event.eventDate) continue;
    const key = jstDateKey(new Date(row.event.eventDate));
    const list = byDay.get(key) ?? [];
    list.push(row);
    byDay.set(key, list);
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <Link
          href={monthHref(monthParam(prev.y, prev.m))}
          scroll={false}
          aria-label="前の月"
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-neutral-500 hover:bg-neutral-100"
        >
          ‹
        </Link>
        <p className="text-[15px] font-bold text-neutral-900">
          {year}年{month}月
        </p>
        <Link
          href={monthHref(monthParam(next.y, next.m))}
          scroll={false}
          aria-label="次の月"
          className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-neutral-500 hover:bg-neutral-100"
        >
          ›
        </Link>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-semibold">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={w} className={`py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-sky-500" : "text-neutral-400"}`}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          const dayRows = byDay.get(cell.key) ?? [];
          const weekday = i % 7;
          const numberClass = cell.isToday
            ? "bg-orange-600 font-bold text-white"
            : !cell.inMonth
              ? "text-neutral-300"
              : weekday === 0
                ? "text-red-500"
                : weekday === 6
                  ? "text-sky-600"
                  : "text-neutral-700";
          const content = (
            <>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[13px] ${numberClass}`}>
                {cell.day}
              </span>
              <span className="flex h-1.5 items-center justify-center gap-0.5">
                {dayRows.slice(0, 3).map((row) => (
                  <span key={row.event.id} className={`h-1.5 w-1.5 rounded-full ${dotClass(row)}`} />
                ))}
              </span>
            </>
          );
          const className = "flex flex-col items-center gap-0.5 rounded-xl py-1";
          if (dayRows.length === 0) {
            return (
              <div key={cell.key} className={className}>
                {content}
              </div>
            );
          }
          return (
            <Link
              key={cell.key}
              href={dayRows.length === 1 ? `/events/${dayRows[0].event.id}` : dayHref(cell.key)}
              className={`${className} hover:bg-orange-50 active:bg-orange-100`}
              aria-label={`${cell.key}の予定（${dayRows.length}件）`}
            >
              {content}
            </Link>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-neutral-100 pt-2 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          参加
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          未定
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
    </div>
  );
}
