import { formatDateTime } from "@/lib/labels";
import { ListLinkCard } from "@/components/ui";

export function NoticeListItem({
  notice,
  eventTitle,
  attachmentCount,
  unread,
}: {
  notice: { id: string; title: string; body: string | null; createdAt: Date };
  eventTitle: string | null;
  attachmentCount?: number;
  unread?: boolean;
}) {
  return (
    <ListLinkCard href={`/notices/${notice.id}`}>
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        {unread && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>}
        {eventTitle && (
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
            {eventTitle}
          </span>
        )}
        <span className="text-[11px] text-neutral-400">{formatDateTime(notice.createdAt)}</span>
      </div>
      <p className="text-[15px] font-bold text-neutral-900">{notice.title}</p>
      {notice.body && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500">{notice.body}</p>}
      {!!attachmentCount && attachmentCount > 0 && (
        <p className="mt-1 text-xs text-neutral-400">📎 添付 {attachmentCount}件</p>
      )}
    </ListLinkCard>
  );
}
