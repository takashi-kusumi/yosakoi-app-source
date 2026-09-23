import Link from "next/link";
import { getNoticesList, markNoticesSeen } from "@/lib/queries";
import { getCurrentMember } from "@/lib/auth";
import { formatDateTime } from "@/lib/labels";
import { FlashMessage } from "@/components/FlashMessage";
import { NoticeTypeFilter, resolveNoticeTypeFilter } from "@/components/NoticeTypeFilter";

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; type?: string }>;
}) {
  const { ok, error, type } = await searchParams;
  const member = await getCurrentMember();
  const allRows = await getNoticesList();
  // この一覧を開いたタイミングで「既読」にする（ボトムナビの未読バッジをクリアするため）
  if (member) {
    await markNoticesSeen(member.id);
  }
  const typeFilter = resolveNoticeTypeFilter(type);
  const rows = typeFilter
    ? typeFilter === "NONE"
      ? allRows.filter((r) => !r.eventType)
      : allRows.filter((r) => r.eventType === typeFilter)
    : allRows;

  return (
    <div className="space-y-4">
      <FlashMessage ok={ok} error={error} />
      <h1 className="text-lg font-bold text-neutral-900">お知らせ</h1>

      <NoticeTypeFilter basePath="/notices" typeFilter={typeFilter} />

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-400">
          {typeFilter ? "該当するお知らせがありません" : "まだお知らせがありません"}
        </p>
      )}

      <ul className="space-y-3">
        {rows.map(({ notice, eventTitle, attachmentCount }) => (
          <li key={notice.id}>
            <Link
              href={`/notices/${notice.id}`}
              className="block rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="mb-1 flex items-center gap-2">
                {eventTitle && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                    {eventTitle}
                  </span>
                )}
                <span className="text-[11px] text-neutral-400">
                  {formatDateTime(notice.createdAt)}
                </span>
              </div>
              <p className="font-semibold text-neutral-900">{notice.title}</p>
              {notice.body && (
                <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{notice.body}</p>
              )}
              {attachmentCount > 0 && (
                <p className="mt-1 text-xs text-neutral-400">📎 添付 {attachmentCount}件</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
