import Link from "next/link";
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_CHIP_CLASS,
  EVENT_TYPE_BAR_CLASS,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  UNANSWERED_BADGE_CLASS,
  eventDateBlock,
  formatTimeRange,
  isEventOpen,
  deadlineLabel,
} from "@/lib/labels";
import { RespondForm } from "@/components/RespondForm";

export type EventCardData = {
  id: string;
  type: string;
  title: string;
  eventDate: Date | string | null;
  endDate?: Date | string | null;
  location: string | null;
  isOpen: boolean;
  responseDeadline?: Date | string | null;
};

export function TypeChip({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        EVENT_TYPE_CHIP_CLASS[type] ?? "bg-neutral-100 text-neutral-600"
      }`}
    >
      {EVENT_TYPE_LABELS[type] ?? type}
    </span>
  );
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${
        status ? STATUS_BADGE_CLASS[status] ?? "bg-neutral-100 text-neutral-500" : UNANSWERED_BADGE_CLASS
      }`}
    >
      {status ? STATUS_LABEL[status] ?? status : "未回答"}
    </span>
  );
}

/**
 * 予定のカード。カード全体がタップ範囲（詳細ページへのリンク）になる。
 * quickRespond を渡すと、カードの中に出欠ボタンを表示する（ボタンはリンクより手前に置く）。
 */
export function EventCard({
  event,
  status,
  note,
  href,
  quickRespond,
  muted,
  rightSlot,
  footer,
}: {
  event: EventCardData;
  status?: string | null;
  note?: string | null;
  href?: string;
  quickRespond?: { redirectTo: string };
  muted?: boolean;
  /** 右上に出す内容（既定は本人の回答バッジ） */
  rightSlot?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const date = eventDateBlock(event.eventDate);
  const open = isEventOpen(event);
  const deadline = open && !status ? deadlineLabel(event.responseDeadline) : null;
  const link = href ?? `/events/${event.id}`;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md active:scale-[0.99] ${
        !status && open && !rightSlot && !muted ? "border-amber-200" : "border-neutral-200"
      } ${muted ? "opacity-70" : ""}`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${EVENT_TYPE_BAR_CLASS[event.type] ?? "bg-neutral-300"}`}
        aria-hidden
      />
      {/* カード全体を覆うリンク（ボタン類は z-10 で手前に出す） */}
      <Link href={link} className="absolute inset-0 z-0" aria-label={`${event.title}の詳細`} />

      <div className="pointer-events-none relative flex gap-3 py-3 pl-4 pr-3">
        <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-50 py-1.5 text-center">
          {date ? (
            <>
              <span className="text-[10px] font-semibold text-neutral-400">{date.month}月</span>
              <span className="text-lg font-bold leading-tight text-neutral-900">{date.day}</span>
              <span
                className={`text-[10px] font-semibold ${
                  date.weekday === "日" ? "text-red-500" : date.weekday === "土" ? "text-sky-600" : "text-neutral-500"
                }`}
              >
                {date.weekday}
              </span>
            </>
          ) : (
            <span className="text-[10px] font-semibold leading-tight text-neutral-400">日時
              <br />未定</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <TypeChip type={event.type} />
                {!open && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
                    締切
                  </span>
                )}
              </div>
              <p className="truncate text-[15px] font-bold text-neutral-900">{event.title}</p>
            </div>
            {rightSlot ?? <StatusBadge status={status} />}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500">
            {date && <span>🕒 {formatTimeRange(event.eventDate, event.endDate)}</span>}
            {event.location && <span className="truncate">📍 {event.location}</span>}
          </p>
          {deadline && (
            <p className="mt-1 text-[11px] font-semibold text-amber-700">⏰ {deadline}</p>
          )}
          {note && (
            <p className="mt-1 truncate text-xs text-neutral-500">
              <span className="text-neutral-400">メモ:</span> {note}
            </p>
          )}
          {footer}
        </div>
      </div>

      {quickRespond && open && (
        <div className="relative z-10 border-t border-neutral-100 px-3 pb-3 pl-4 pt-2.5">
          <RespondForm eventId={event.id} currentStatus={status as never} redirectTo={quickRespond.redirectTo} />
        </div>
      )}
    </div>
  );
}
