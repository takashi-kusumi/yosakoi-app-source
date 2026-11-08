import { getCurrentMember } from "@/lib/auth";
import { getUpcomingOpenEventsForMember } from "@/lib/queries";
import { deadlineLabel, eventDateBlock, EVENT_TYPE_CHIP_CLASS, EVENT_TYPE_LABELS, formatTimeRange } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";
import { BulkAnswerForm, type BulkEventRow } from "@/components/BulkAnswerForm";
import { BackLink, EmptyState, PageTitle } from "@/components/ui";

export default async function BulkAnswerPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const member = await getCurrentMember();
  if (!member) return null;

  const upcoming = await getUpcomingOpenEventsForMember(member.id);
  const rows: BulkEventRow[] = upcoming.map(({ event, response }) => {
    const d = eventDateBlock(event.eventDate);
    return {
      id: event.id,
      title: event.title,
      typeLabel: EVENT_TYPE_LABELS[event.type] ?? event.type,
      typeChipClass: EVENT_TYPE_CHIP_CLASS[event.type] ?? "bg-neutral-100 text-neutral-600",
      dateLabel: d ? `${d.month}/${d.day}(${d.weekday}) ${formatTimeRange(event.eventDate, event.endDate)}` : "日時未定",
      weekday: d?.weekday ?? "",
      location: event.location,
      deadline: deadlineLabel(event.responseDeadline),
      status: response?.status ?? null,
      note: response?.note ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <BackLink href="/dashboard" label="ホーム" />
      <PageTitle>まとめて回答</PageTitle>
      <p className="-mt-2 text-xs text-neutral-400">
        回答を受付中の予定を一覧で選んで、最後に一度だけ保存します（{rows.length}件）。
      </p>
      {rows.length === 0 ? <EmptyState>回答を受付中の予定はありません</EmptyState> : <BulkAnswerForm rows={rows} />}
    </div>
  );
}
